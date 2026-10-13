import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { shopierOrderSchema, shopierRefundSchema, createShopierClient, ShopierError } from "../lib/shopier/api.ts";
import { recordShopierOrder, activeGrant, activeCourseAccess } from "../lib/akademi/course-access.ts";
import { OwnerInputError } from "../lib/akademi/owner-commands.ts";
import { createAkademi } from "../lib/akademi/akademi.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
let sequence = 700000000;
before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values({ id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true });
  await db.insert(schema.owners).values({ userId: "owner" });
});
after(() => client.close());

/** A verified student who bought one course for ₺100 and has access to it. */
async function fixture() {
  const id = String(sequence++);
  await db.insert(schema.user).values({ id, name: "Student", email: `${id}@example.com`, emailVerified: true });
  const [course] = await db.insert(schema.courses).values({ slug: `course-${id}`, shopierProductId: id, accessDurationDays: 30 }).returning();
  const order = shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: "2026-10-01T10:00:00+0300", currency: "TRY",
    billingInfo: { email: `${id}@example.com` }, lineItems: [{ productId: id, total: "100.00" }] });
  await recordShopierOrder(db, order);
  return { id, course, order,
    access: async () => (await db.select().from(schema.courseAccess).where(and(eq(schema.courseAccess.userId, id), eq(schema.courseAccess.courseId, course.id), isNull(schema.courseAccess.revokedAt))))[0],
    request: async () => (await db.select().from(schema.refundRequests).where(eq(schema.refundRequests.userId, id)).orderBy(schema.refundRequests.createdAt)).at(-1) };
}
/** A fake Shopier that completes every refund at once, typed full when it covers the ₺100 order. */
function shop(createRefund) {
  const sent = [];
  return { sent, akademi: createAkademi({ db, shopier: { listProducts: async () => ({ products: [], ids: new Set() }), createRefund: createRefund ?? (async (orderId, amountKurus, note) => {
    sent.push({ orderId, amountKurus, note });
    return shopierRefundSchema.parse({ id: String(sequence++), orderId, status: "succeeded", type: amountKurus === 10000 ? "full" : "partial", currency: "TRY", total: (amountKurus / 100).toFixed(2), dateCreated: "2026-10-04T10:00:00+0300" });
  }) } }) };
}
const audits = async id => (await db.select().from(schema.adminAuditLog).where(eq(schema.adminAuditLog.resourceId, id)).orderBy(schema.adminAuditLog.createdAt)).map(row => row.action);

test("a student asks once per purchase, and only for a course they bought", async () => {
  const f = await fixture(), { akademi } = shop();
  assert.deepEqual(await akademi.access.refundState(f.id, f.course.id), { request: null, bundleProductId: null });
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Beklediğim gibi değildi."), "requested");
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Tekrar soruyorum."), "already_pending");
  assert.equal((await akademi.access.refundState(f.id, f.course.id)).request.status, "pending");
  const other = await fixture();
  assert.equal(await akademi.access.requestRefund(f.id, other.course.id, "Benim olmayan eğitim."), "no_purchase");
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Dördüncü deneme."), "rate_limited");
  assert.ok((await akademi.owner.catalogSnapshot()).pendingRefunds >= 1);
  const [listed] = (await akademi.owner.refundRequests({ status: "pending", search: f.order.id })).items;
  assert.deepEqual([listed.courseId, listed.email, listed.reason, listed.amountKurus], [f.course.id, `${f.id}@example.com`, "Beklediğim gibi değildi.", 10000]);
});

test("approving the full amount refunds through Shopier, removes access and cannot be repeated", async () => {
  const f = await fixture(), { akademi, sent } = shop();
  await akademi.access.requestRefund(f.id, f.course.id, "Beklediğim gibi değildi.");
  const request = await f.request();
  await akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "İyi günler." });
  assert.deepEqual(sent, [{ orderId: f.order.id, amountKurus: 10000, note: "İyi günler." }]);
  const decided = await f.request();
  assert.deepEqual([decided.status, decided.amountKurus, decided.decidedBy, decided.ownerNote, typeof decided.shopierRefundId], ["approved", 10000, "owner", "İyi günler.", "string"]);
  assert.equal(await f.access(), undefined, "a full refund closes the course");
  assert.deepEqual(await audits(request.id), ["refund_request.refund_requested", "refund_request.refund_done"]);
  await assert.rejects(() => akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "" }), OwnerInputError);
  assert.equal(sent.length, 1, "the money is sent once");
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Bir daha."), "no_purchase");
});

test("approval removes access even for a partial payment refund; rejection restores it", async () => {
  const f = await fixture(), { akademi, sent } = shop();
  await akademi.access.requestRefund(f.id, f.course.id, "Yarısını geri istiyorum.");
  const first = await f.request();
  await assert.rejects(() => akademi.owner.decideRefundRequest("owner", first.id, { approve: true, amountKurus: 10001, note: "" }), /kalan tutarını aşamaz/);
  assert.equal((await f.request()).status, "pending");
  await akademi.owner.decideRefundRequest("owner", first.id, { approve: true, amountKurus: 4000, note: "" });
  assert.deepEqual(sent.map(s => [s.amountKurus, s.note]), [[4000, undefined]]);
  assert.equal(await activeGrant(db, f.id, f.course.id), null, "approval removes course access even for a partial refund");
  assert.deepEqual(await activeCourseAccess(db, f.id), []);
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Kalanını da istiyorum."), "refunded");
  const [module] = await db.insert(schema.modules).values({ courseId: f.course.id, title: "Module" }).returning();
  const [lesson] = await db.insert(schema.lessons).values({ courseId: f.course.id, moduleId: module.id, slug: "lesson", title: "Lesson", kind: "video" }).returning();
  await db.insert(schema.lessonProgress).values({ userId: f.id, lessonId: lesson.id });
  await recordShopierOrder(db, { ...f.order, id: String(sequence++), dateCreated: new Date("2026-10-05T10:00:00+0300") });
  assert.deepEqual(await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, f.id)), [], "buying again after an approved refund starts over");
  const rejected = await fixture();

  await akademi.access.requestRefund(rejected.id, rejected.course.id, "İade istiyorum.");
  const second = await rejected.request();
  await assert.rejects(() => akademi.owner.decideRefundRequest("owner", second.id, { approve: true, amountKurus: 10001, note: "" }), /kalan tutarını aşamaz/);
  await akademi.owner.decideRefundRequest("owner", second.id, { approve: false, note: "Eğitimin yarısı izlenmiş." });
  assert.deepEqual((await akademi.access.refundState(rejected.id, rejected.course.id)).request, { status: "declined", ownerNote: "Eğitimin yarısı izlenmiş." });
  assert.deepEqual(await audits(second.id), ["refund_request.declined"]);
  assert.equal(sent.length, 1);
  assert.ok(await activeGrant(db, rejected.id, rejected.course.id), "rejection restores access");
  assert.equal(await akademi.access.requestRefund(rejected.id, rejected.course.id, "Lütfen yeniden değerlendirin."), "requested");
});

test("a refusal from Shopier reopens the request; an unclear failure keeps it closed so the money is not sent twice", async () => {
  const f = await fixture();
  const refused = shop(async () => { throw new ShopierError(422, "refused", "amount too high"); }).akademi;
  await refused.access.requestRefund(f.id, f.course.id, "Beklediğim gibi değildi.");
  const request = await f.request();
  await assert.rejects(() => refused.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "" }), ShopierError);
  assert.deepEqual([(await f.request()).status, (await f.request()).decidedAt], ["pending", null]);
  assert.deepEqual(await audits(request.id), ["refund_request.refund_requested", "refund_request.refund_failed"]);

  const silent = shop(async () => { throw new Error("timeout"); }).akademi;
  await assert.rejects(() => silent.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "" }), /timeout/);
  assert.deepEqual([(await f.request()).status, (await f.request()).shopierRefundId], ["approved", null]);
  assert.equal(await activeGrant(db, f.id, f.course.id), null, "an ambiguous approval blocks content while the owner checks Shopier");
  assert.equal((await db.select().from(schema.refundRequests).where(eq(schema.refundRequests.status, "pending"))).some(row => row.id === request.id), false);
});

test("the Shopier client posts a refund as a decimal amount and rejects bad input before calling", async () => {
  const calls = [];
  const api = createShopierClient("token", async (url, init) => { calls.push([url, init.method, JSON.parse(init.body)]);
    return Response.json({ id: 9, orderId: 123456, status: "pending", type: "partial", currency: "TRY", total: "12.50", dateCreated: "2026-10-04T10:00:00+0300" }); });
  assert.deepEqual([(await api.createRefund("123456", 1250, "Not")).status, (await api.createRefund("123456", 1250)).id], ["pending", "9"]);
  assert.deepEqual(calls.map(([url, method, body]) => [new URL(url).pathname.endsWith("/refunds"), method, body]),
    [[true, "POST", { orderId: "123456", amount: "12.50", note: "Not" }], [true, "POST", { orderId: "123456", amount: "12.50" }]]);
  for (const [order, amount] of [["../orders", 100], ["123456", 0], ["123456", 1.5]]) await assert.rejects(() => api.createRefund(order, amount), /Invalid Shopier refund/);
  assert.equal(calls.length, 2);
});

test("Shopier's accepted pending refund with an empty refund date is recorded without an approval error", async () => {
  const f = await fixture();
  let posts = 0;
  const api = createShopierClient("token", async () => {
    posts++;
    return Response.json({ id: "999", orderId: f.order.id, status: "pending", type: "full", currency: "TRY", total: "100.00", dateCreated: "2026-10-05T14:16:00+0300", dateRefunded: "" });
  });
  const akademi = shop(api.createRefund).akademi;
  await akademi.access.requestRefund(f.id, f.course.id, "Beklediğim gibi değildi.");
  const request = await f.request();
  await akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "" });
  assert.equal((await f.request()).shopierRefundId, "999");
  assert.equal(posts, 1);
  assert.equal(await activeGrant(db, f.id, f.course.id), null, "accepted approval removes access before payment completion");
  assert.deepEqual(await activeCourseAccess(db, f.id), []);
  await assert.rejects(() => akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "" }), OwnerInputError);
  assert.equal(posts, 1, "approval cannot submit the same refund twice");
});

test("new refund requests atomically queue one owner email, addressed to the requested inbox", async () => {
  const { createEmailOutbox } = await import("../lib/email/outbox.ts");
  const key = "test-refund-email-key-0123456789abcdef";
  const f = await fixture();
  const akademi = createAkademi({ db, shopier: {}, refundNotification: { encryptionKey: key, siteUrl: "https://www.nilgunoygur.com" } });
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Bir sorum var <script>alert(1)</script>"), "requested");
  assert.equal(await akademi.access.requestRefund(f.id, f.course.id, "Tekrar soruyorum"), "already_pending");
  const sent = [];
  await createEmailOutbox(db, key).deliverBatch(async message => { sent.push(message); return "email-1"; });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "butunselsifaakademi@gmail.com");
  assert.equal(sent[0].replyTo, `${f.id}@example.com`);
  assert.match(sent[0].text, new RegExp(f.order.id));
  assert.match(sent[0].text, /\/yonetim\/iadeler/);
  assert.match(sent[0].html, /&lt;script&gt;/);
  const broken = await fixture();
  const invalid = createAkademi({ db, shopier: {}, refundNotification: { encryptionKey: "short", siteUrl: "https://example.com" } });
  await assert.rejects(() => invalid.access.requestRefund(broken.id, broken.course.id, "E-posta hazırlanamadı"));
  assert.equal(await broken.request(), undefined, "a failed email enqueue rolls back the request so a retry can notify");
});

test("a decided request leaves the account menu two weeks after the decision; a pending one stays", async () => {
  const { studentRefundRequests } = await import("../lib/akademi/refund-requests.ts");
  const f = await fixture(), { akademi } = shop();
  await akademi.access.requestRefund(f.id, f.course.id, "Beklediğim gibi değildi.");
  const statuses = async days => (await studentRefundRequests(db, f.id, new Date(Date.now() + days * 86_400_000))).map(row => row.status);
  assert.deepEqual(await statuses(30), ["pending"]);
  await akademi.owner.decideRefundRequest("owner", (await f.request()).id, { approve: false, note: "Uygun değil." });
  assert.deepEqual(await statuses(13), ["declined"]);
  assert.deepEqual(await statuses(15), []);
});

test("the refund management list preserves decision history, filters and paginates requests", async () => {
  const { listRefundRequests } = await import("../lib/akademi/refund-requests.ts");
  const f = await fixture(), { akademi } = shop();
  await akademi.access.requestRefund(f.id, f.course.id, "Karar verin.");
  const request = await f.request();
  assert.equal((await listRefundRequests(db, { status: "pending", search: f.order.id })).items[0].id, request.id);
  await akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 10000, note: "Onaylandı" });
  const history = await listRefundRequests(db, { status: "approved", search: f.order.id });
  assert.equal(history.total, 1);
  assert.equal(history.items[0].completed, true);
  assert.equal(history.items[0].ownerNote, "Onaylandı");
  assert.equal((await listRefundRequests(db, { status: "pending", search: f.order.id })).total, 0);
  assert.equal((await listRefundRequests(db, { search: "%" })).total, 0, "search wildcards are literal");
  for (let index = 0; index < 21; index++) {
    const entry = await fixture();
    await akademi.access.requestRefund(entry.id, entry.course.id, "Sayfalama talebi");
  }
  const first = await listRefundRequests(db, { page: 1 });
  const second = await listRefundRequests(db, { page: 2 });
  assert.equal(first.items.length, 20);
  assert.ok(second.items.length > 0);
  assert.ok(second.items.every(row => !first.items.some(other => row.id === other.id)));
});

/** A student who bought a ₺300 bundle of three courses. */
async function bundleFixture() {
  const id = String(sequence++);
  await db.insert(schema.user).values({ id, name: "Paket", email: `${id}@example.com`, emailVerified: true });
  const [bundle, ...included] = await db.insert(schema.courses).values([0, 1, 2, 3].map(n => ({ slug: `bundle-${id}-${n}`, shopierProductId: `${id}${n}`, accessDurationDays: 30 }))).returning();
  await db.insert(schema.bundleItems).values(included.map(course => ({ bundleId: bundle.id, courseId: course.id })));
  const order = shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: "2026-10-01T10:00:00+0300", currency: "TRY",
    billingInfo: { email: `${id}@example.com` }, lineItems: [{ productId: `${id}0`, total: "300.00" }] });
  await recordShopierOrder(db, order);
  const now = new Date("2026-10-05T10:00:00+0300");
  return { id, bundle, included, order, now, open: async () => (await Promise.all(included.map(course => activeGrant(db, id, course.id, now)))).filter(Boolean).length,
    listed: async () => (await activeCourseAccess(db, id, now)).length };
}

test("a refund request for one course of a bundle covers the whole bundle", async () => {
  const f = await bundleFixture(), { akademi } = shop();
  const [a, b, c] = f.included;
  assert.equal(await f.open(), 3);
  assert.deepEqual(await akademi.access.refundState(f.id, a.id), { request: null, bundleProductId: f.bundle.shopierProductId });
  assert.equal(await akademi.access.requestRefund(f.id, a.id, "Paketi iade etmek istiyorum."), "requested");
  assert.equal(await akademi.access.requestRefund(f.id, b.id, "Diğer eğitim için de."), "already_pending", "one request per bundle order");
  assert.equal(await f.open(), 0, "every course of the bundle is closed while the request is pending");
  assert.equal(await f.listed(), 3);
  assert.ok((await activeCourseAccess(db, f.id, f.now)).every(item => item.refundPending));
  for (const course of f.included) assert.equal((await akademi.access.refundState(f.id, course.id)).request.status, "pending", "each course page shows the request");
  const [listed] = (await akademi.owner.refundRequests({ status: "pending", search: f.order.id })).items;
  assert.deepEqual([listed.bundled, listed.amountKurus, listed.productId, listed.course, listed.courseId], [true, 30000, f.bundle.shopierProductId, f.bundle.slug, f.bundle.id], "the owner sees the bundle and what was paid for it");

  await akademi.owner.decideRefundRequest("owner", listed.id, { approve: false, note: "Süre doldu." });
  assert.equal(await f.open(), 3);
  assert.equal((await akademi.access.refundState(f.id, c.id)).request.status, "declined");
});

test("approving a bundle refund removes every course, also when Shopier treats it as partial", async () => {
  const f = await bundleFixture(), { akademi, sent } = shop();
  await akademi.access.requestRefund(f.id, f.included[0].id, "İade.");
  const [request] = (await akademi.owner.refundRequests({ status: "pending", search: f.order.id })).items;
  await assert.rejects(() => akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 30001, note: "" }), OwnerInputError);
  await akademi.owner.decideRefundRequest("owner", request.id, { approve: true, amountKurus: 30000, note: "" });
  assert.deepEqual(sent.map(item => item.amountKurus), [30000]);
  assert.equal(await f.open(), 0);
  assert.equal(await f.listed(), 0, "the bundle's courses leave the student's list");
  assert.equal(await akademi.access.requestRefund(f.id, f.included[2].id, "Yine."), "refunded");

  const again = shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: "2026-10-04T12:00:00+0300", currency: "TRY",
    billingInfo: { email: `${f.id}@example.com` }, lineItems: [{ productId: f.included[0].shopierProductId, total: "100.00" }] });
  await recordShopierOrder(db, again);
  assert.equal(await f.open(), 1);
  const grant = await activeGrant(db, f.id, f.included[0].id, f.now);
  assert.equal(grant.startsAt.toISOString(), again.dateCreated.toISOString(), "the refunded bundle's days are not carried over");
});

test("a course bought alone is untouched by a refund request on a bundle that does not contain its purchase", async () => {
  const f = await bundleFixture(), { akademi } = shop();
  const [course] = await db.insert(schema.courses).values({ slug: `single-${f.id}`, shopierProductId: `${f.id}9`, accessDurationDays: 30 }).returning();
  await recordShopierOrder(db, shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: "2026-10-02T10:00:00+0300", currency: "TRY",
    billingInfo: { email: `${f.id}@example.com` }, lineItems: [{ productId: `${f.id}9`, total: "100.00" }] }));
  await akademi.access.requestRefund(f.id, f.included[0].id, "Paket.");
  assert.ok(await activeGrant(db, f.id, course.id, f.now), "only the bundle is suspended");
  assert.equal((await akademi.access.refundState(f.id, course.id)).request, null);
});
