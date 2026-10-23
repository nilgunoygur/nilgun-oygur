import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { shopierOrderSchema, isValidWebhookSignature, toKurus, parseShopierProduct, createShopierClient } from "../lib/shopier/api.ts";
import { recordShopierOrder, claimPurchase, claimPurchasesByEmail, claimShopierOrder, activeCourseAccess, activeGrant } from "../lib/akademi/course-access.ts";
import { handleShopierWebhook } from "../lib/akademi/shopier-webhook.ts";
import { syncCatalogFromShopier, listCatalog, findCatalogCourse, ownerCatalog } from "../lib/akademi/catalog.ts";
import { createAkademi } from "../lib/akademi/akademi.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
let course, other;
const DAY = 86_400_000;
let nextOrder = 900000000;
const order = (fields = {}) => shopierOrderSchema.parse({
  id: String(nextOrder++), paymentStatus: "paid", dateCreated: "2026-09-21T10:00:00+0300", currency: "TRY",
  shippingInfo: { email: "Buyer@Example.com " }, billingInfo: { email: "" },
  lineItems: [{ productId: "51075042", title: "Kurs", quantity: 1, total: "1.00" }], ...fields,
});
const activeGrants = (userId) => db.select().from(schema.courseAccess).where(and(eq(schema.courseAccess.userId, userId), isNull(schema.courseAccess.revokedAt)));

before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values([
    { id: "buyer", name: "Buyer", email: "buyer@example.com", emailVerified: true },
    { id: "unverified", name: "U", email: "late@example.com", emailVerified: false },
    { id: "student-b", name: "B", email: "b@example.com", emailVerified: true },
    { id: "student-c", name: "C", email: "c@example.com", emailVerified: true },
  ]);
  [course, other] = await db.insert(schema.courses).values([
    { slug: "kurs", accessDurationDays: 30, shopierProductId: "51075042" },
    { slug: "diger", accessDurationDays: 10, shopierProductId: "51075057" },
  ]).returning();
});
after(async () => { await client.close(); });

test("Shopier helpers parse amounts, dates, product links and webhook signatures", () => {
  assert.equal(toKurus("2750.00"), 275000);
  assert.equal(toKurus("1.5"), 150);
  assert.throws(() => toKurus("-1"));
  assert.equal(order().dateCreated.toISOString(), "2026-09-21T07:00:00.000Z");
  assert.deepEqual(parseShopierProduct("https://www.shopier.com/51075042"), { id: "51075042", url: "https://www.shopier.com/51075042" });
  assert.equal(parseShopierProduct("51075042")?.id, "51075042");
  assert.equal(parseShopierProduct("https://evil.example/51075042"), null);
  const body = '{"id":"1"}';
  const signature = createHmac("sha256", "token").update(body).digest("hex");
  assert.equal(isValidWebhookSignature(body, signature, "token"), true);
  assert.equal(isValidWebhookSignature(body + " ", signature, "token"), false);
  assert.equal(isValidWebhookSignature(body, signature, "other"), false);
  assert.equal(isValidWebhookSignature(body, null, "token"), false);
  assert.equal(isValidWebhookSignature(body, signature, ""), false);
});

test("a paid order grants the matching verified student once, from the payment time", async () => {
  const paid = order();
  const first = await recordShopierOrder(db, paid);
  assert.equal(first.granted, 1);
  assert.deepEqual(await recordShopierOrder(db, paid), { purchaseIds: first.purchaseIds, granted: 0 });
  const [grant] = await activeGrants("buyer");
  assert.equal(grant.courseId, course.id);
  assert.equal(grant.startsAt.toISOString(), paid.dateCreated.toISOString());
  assert.equal(grant.expiresAt.getTime() - grant.startsAt.getTime(), 30 * DAY);
  const [purchase] = await db.select().from(schema.shopierPurchases).where(eq(schema.shopierPurchases.shopierOrderId, paid.id));
  assert.equal(purchase.buyerEmail, "buyer@example.com");
  assert.equal(purchase.amountKurus, 100);
});

test("buying again while access is active extends it instead of replacing it", async () => {
  const [before] = await activeGrants("buyer");
  await recordShopierOrder(db, order({ dateCreated: "2026-09-25T10:00:00+0300" }));
  const grants = await activeGrants("buyer");
  assert.equal(grants.length, 1);
  assert.equal(grants[0].expiresAt.getTime(), before.expiresAt.getTime() + 30 * DAY);
  assert.equal(grants[0].startsAt.getTime(), before.startsAt.getTime());
});

test("unpaid, unknown and email-less orders never create access", async () => {
  assert.equal((await recordShopierOrder(db, order({ paymentStatus: "unpaid" }))).reason, "unpaid");
  assert.equal((await recordShopierOrder(db, order({ lineItems: [{ productId: "13908064", total: "2750.00" }] }))).reason, "no_course");
  assert.equal((await recordShopierOrder(db, order({ shippingInfo: { email: "not-an-email" } }))).reason, "no_email");
});

test("a purchase waits for its buyer to verify the same email", async () => {
  const paid = order({ shippingInfo: { email: "late@example.com" }, lineItems: [{ productId: "51075057", total: "2.00" }] });
  assert.equal((await recordShopierOrder(db, paid)).granted, 0);
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, "unverified"));
  assert.equal(await claimPurchasesByEmail(db, "unverified", "LATE@example.com"), 1);
  assert.equal(await claimPurchasesByEmail(db, "unverified", "late@example.com"), 0);
  const [grant] = await activeGrants("unverified");
  assert.equal(grant.courseId, other.id);
});

test("claiming by order number requires the Shopier buyer email and succeeds only once", async () => {
  const paid = order({ shippingInfo: { email: "someone-else@example.com" } });
  assert.equal(await claimShopierOrder(db, paid, "b@example.com", "student-b"), "not_found");
  assert.equal(await claimShopierOrder(db, null, "someone-else@example.com", "student-b"), "not_found");
  assert.equal(await claimShopierOrder(db, paid, " Someone-Else@example.com", "student-b"), "granted");
  assert.equal(await claimShopierOrder(db, paid, "someone-else@example.com", "student-b"), "already_yours");
  assert.equal(await claimShopierOrder(db, paid, "someone-else@example.com", "student-c"), "claimed_by_other");
  assert.equal((await activeGrants("student-c")).length, 0);
  assert.equal(await claimShopierOrder(db, order({ shippingInfo: { email: "x@example.com" }, lineItems: [{ productId: "1", total: "1.00" }] }), "x@example.com", "student-c"), "not_academy");
});

test("concurrent claims of one purchase grant exactly one student", async () => {
  const paid = order({ shippingInfo: { email: "nobody@example.com" } });
  const { purchaseIds: [id] } = await recordShopierOrder(db, paid);
  const results = await Promise.all([claimPurchase(db, id, "student-c"), claimPurchase(db, id, "buyer")]);
  assert.deepEqual(results.filter(Boolean).length, 1);
  assert.equal((await db.select().from(schema.courseAccess).where(eq(schema.courseAccess.sourcePurchaseId, id))).length, 1);
});

test("the database rejects grants that do not match their purchase's student or course", async () => {
  const [purchase] = await db.select().from(schema.shopierPurchases).where(eq(schema.shopierPurchases.userId, "student-b")).limit(1);
  const rejects = (values, code) => assert.rejects(() => db.insert(schema.courseAccess).values(values), (e) => (e.cause?.code ?? e.code) === code);
  const base = { startsAt: new Date(), expiresAt: new Date(Date.now() + DAY) };
  await rejects({ ...base, userId: "student-c", courseId: purchase.courseId, sourcePurchaseId: purchase.id }, "23505");
  await rejects({ ...base, userId: "student-c", courseId: other.id, sourcePurchaseId: null }, "23514");
  await assert.rejects(() => db.update(schema.shopierPurchases).set({ buyerEmail: "Upper@Example.com" }).where(eq(schema.shopierPurchases.id, purchase.id)));
  await assert.rejects(() => db.insert(schema.courses).values({ slug: "unlinked" }));
});

test("the client sends the bearer token and treats missing orders as absent", async () => {
  const calls = [];
  const fake = async (url, init) => { calls.push({ url, init }); return url.endsWith("/orders/404") ? new Response("{}", { status: 404 }) : Response.json(order({ id: "77" })); };
  const shopier = createShopierClient("secret-token", fake);
  assert.equal((await shopier.getOrder("77")).id, "77");
  assert.equal(await shopier.getOrder("404"), null);
  assert.equal(await shopier.getOrder("../products"), null);
  assert.equal(calls[0].init.headers.authorization, "Bearer secret-token");
  assert.equal(calls.length, 2);
});

test("webhooks must be signed, are applied once, and failures are retried", async () => {
  const body = JSON.stringify({ id: "555000111", paymentStatus: "paid", dateCreated: "2026-09-21T12:00:00+0300", currency: "TRY", shippingInfo: { email: "c@example.com" }, lineItems: [{ productId: "51075057", total: "2.00" }] });
  const sign = (raw, token = "hook-token") => createHmac("sha256", token).update(raw).digest("hex");
  const headers = (raw, extra = {}) => new Headers({ "shopier-event": "order.created", "shopier-webhook-id": "wh-1", "shopier-signature": sign(raw), ...extra });
  const hook = (raw, h) => handleShopierWebhook(db, raw, h, ["hook-token"]);
  assert.deepEqual(await hook(body, headers(body, { "shopier-signature": sign(body, "wrong") })), { status: 401, outcome: "invalid_signature", catalogChanged: false });
  assert.equal((await hook(body, headers(body, { "shopier-event": "unknown.event" }))).outcome, "ignored_event");
  assert.deepEqual(await hook(body, headers(body)), { status: 200, outcome: "recorded", catalogChanged: false });
  assert.deepEqual(await hook(body, headers(body)), { status: 200, outcome: "duplicate", catalogChanged: false });
  assert.equal((await activeGrants("student-c")).filter(g => g.courseId === other.id).length, 1);
  const broken = '{"id":"1"}';
  assert.deepEqual(await hook(broken, headers(broken, { "shopier-webhook-id": "wh-2" })), { status: 500, outcome: "failed", catalogChanged: false });
  const [failed] = await db.select().from(schema.providerEvents).where(eq(schema.providerEvents.eventIdentity, "order.created:wh-2"));
  assert.equal(failed.status, "failed");
  assert.ok(!failed.errorDetails.includes("c@example.com"));
});

test("the Shopier product API is the catalog: link course products, archive sold ones whose product is deleted", async () => {
  const { parsePriceKurus, productDetails, isCourseProduct, shopierProductSchema: schemaOf } = await import("../lib/shopier/api.ts");
  assert.equal(parsePriceKurus("950"), 95000);
  assert.equal(parsePriceKurus("2.490,50"), 249050);
  assert.equal(parsePriceKurus("abc"), null);
  const product = (fields) => schemaOf.parse({ id: "51075042", title: "Kurs", description: "Açıklama", type: "digital", customListing: false, stockStatus: "inStock",
    media: [{ url: "https://cdn.shopier.app/pictures_large/b.jpg", placement: 2 }, { url: "https://cdn.shopier.app/pictures_large/a.jpg", placement: 1 }],
    priceData: { currency: "TRY", price: "2490.00", discount: false, discountedPrice: "2490.00" }, ...fields });
  assert.deepEqual(productDetails(product({ priceData: { currency: "TRY", price: "5.00", discount: true, discountedPrice: "4.00" } })),
    { title: "Kurs", description: "Açıklama", imageUrl: "https://cdn.shopier.app/pictures_large/a.jpg", priceKurus: 400, compareAtPriceKurus: 500, currency: "TRY" });
  assert.equal(productDetails(product({ media: [{ url: "https://evil.example/x.jpg" }] })).imageUrl, null);
  assert.deepEqual([product({}), product({ type: "physical" }), product({ customListing: true }), product({ stockStatus: "outOfStock" })].map(p => isCourseProduct(p)), [true, false, true, false]);

  // 51075042 is linked and still exists; 51075057 was deleted; four new products, two of them courses.
  const catalog = [
    product({}),
    product({ id: "60000001", title: "Yeni Kurs" }),
    product({ id: "60000002", title: "Kitap", type: "physical" }),
    product({ id: "60000003", title: "Gizli", customListing: true }),
    product({ id: "60000004", title: "Tükendi", stockStatus: "outOfStock" }),
  ];
  const source = (products, extraIds = []) => ({
    listProducts: async () => ({ products, ids: new Set([...products.map(p => p.id), ...extraIds]) }),
    getProduct: async () => null,
  });
  assert.deepEqual(await syncCatalogFromShopier(db, source(catalog)), { added: 2, archived: 1, deleted: [], files: [] });
  const bySlug = Object.fromEntries((await db.select().from(schema.courses)).map(c => [c.slug, c]));
  assert.equal(bySlug["yeni-kurs"].status, "published");
  assert.equal(bySlug["yeni-kurs"].shopierProductId, "60000001");
  assert.equal(bySlug["gizli"].status, "draft", "a product hidden from the Shopier store waits for the owner to publish it");
  assert.equal(bySlug["diger"].status, "archived", "a sold course stays as the record of its purchases");
  for (const slug of ["kitap", "tukendi"]) assert.equal(bySlug[slug], undefined);
  assert.deepEqual(await syncCatalogFromShopier(db, source(catalog)), { added: 0, archived: 0, deleted: [], files: [] });
  // A product that fails validation still counts as existing, and a failed list call archives nothing.
  assert.equal((await syncCatalogFromShopier(db, source([], ["51075042", "60000001", "60000003"]))).archived, 0);
  await assert.rejects(() => syncCatalogFromShopier(db, { listProducts: async () => { throw new Error("503"); } }));
  assert.equal((await db.select().from(schema.courses).where(eq(schema.courses.slug, "yeni-kurs")))[0].status, "published");
});

test("a course whose Shopier product is deleted goes with it once Shopier confirms, unless a bundle keeps it", async () => {
  const [gone, bundled, pack, unlisted] = await db.insert(schema.courses).values([
    { slug: "silinen", shopierProductId: "61000001" },
    { slug: "paketteki", shopierProductId: "61000002" },
    { slug: "paket-x", shopierProductId: "61000003" },
    { slug: "listede-yok", shopierProductId: "61000004" },
  ]).returning();
  const [section] = await db.insert(schema.modules).values({ courseId: gone.id, title: "Program" }).returning();
  const [lesson] = await db.insert(schema.lessons).values({ courseId: gone.id, moduleId: section.id, slug: "ders", title: "Ders", kind: "live" }).returning();
  await db.insert(schema.lessonFiles).values({ lessonId: lesson.id, name: "odev.pdf", pathname: "lessons/silinen.pdf", mime: "application/pdf", sizeBytes: 10 });
  await db.insert(schema.bundleItems).values({ bundleId: pack.id, courseId: bundled.id });
  const asked = [];
  const shopier = {
    listProducts: async () => ({ products: [], ids: new Set(["51075042", "60000001", "60000003", "61000003"]) }),
    // 61000004 is missing from a short list but Shopier still has it.
    getProduct: async (id) => { asked.push(id); return id === "61000004" ? { id } : null; },
  };

  assert.deepEqual(await syncCatalogFromShopier(db, shopier), { added: 0, archived: 1, deleted: ["silinen"], files: ["lessons/silinen.pdf"] });
  assert.deepEqual(asked.sort(), ["61000001", "61000004"], "only a course that could be deleted is confirmed with Shopier");
  const bySlug = Object.fromEntries((await db.select().from(schema.courses)).map(c => [c.slug, c]));
  assert.equal(bySlug["silinen"], undefined);
  assert.equal((await db.select().from(schema.lessons).where(eq(schema.lessons.courseId, gone.id))).length, 0);
  assert.equal((await db.select().from(schema.modules).where(eq(schema.modules.courseId, gone.id))).length, 0);
  assert.equal(bySlug["paketteki"].status, "archived", "a bundle still sells it");
  assert.equal(bySlug["listede-yok"].status, "published");
  assert.equal(bySlug["diger"].status, "archived");

  await db.delete(schema.bundleItems).where(eq(schema.bundleItems.bundleId, pack.id));
  for (const course of [bundled, pack, unlisted]) await db.delete(schema.courses).where(eq(schema.courses.id, course.id));
});

test("product webhooks link new course products and flag changes for cache refresh", async () => {
  const product = (fields) => JSON.stringify({ id: "70000001", title: "Kuantum Eğitimi", description: "Açıklama", type: "digital", customListing: false, stockStatus: "inStock",
    media: [{ type: "image", url: "https://cdn.shopier.app/pictures_large/k.jpg", placement: 1 }],
    priceData: { currency: "TRY", price: "2490.00", discount: false, discountedPrice: "" }, ...fields });
  const send = (raw, event, id) => handleShopierWebhook(db, raw, new Headers({ "shopier-event": event, "shopier-webhook-id": id, "shopier-signature": createHmac("sha256", "product-token").update(raw).digest("hex") }), ["order-token", "product-token"]);
  assert.deepEqual(await send(product({}), "product.created", "p-1"), { status: 200, outcome: "added", catalogChanged: true });
  const [added] = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000001"));
  assert.deepEqual([added.slug, added.status, added.accessDurationDays], ["kuantum-egitimi", "published", 365]);
  assert.equal((await send(product({ priceData: { currency: "TRY", price: "2490.00", discount: true, discountedPrice: "1990.00" } }), "product.updated", "p-2")).outcome, "changed");
  for (const [fields, id] of [[{ id: "70000003", type: "physical" }, "p-4"], [{ id: "70000004", stockStatus: "outOfStock" }, "p-5"]]) {
    assert.deepEqual(await send(product(fields), "product.created", id), { status: 200, outcome: "ignored", catalogChanged: false });
  }
  // A product hidden from the Shopier store is linked as a draft, exactly as the sync links it.
  assert.equal((await send(product({ id: "70000005", title: "Gizli Test", customListing: true }), "product.created", "p-7")).outcome, "added");
  assert.equal((await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000005")))[0].status, "draft");
  await db.update(schema.courses).set({ status: "archived" }).where(eq(schema.courses.id, added.id));
  assert.equal((await send(product({ title: "Yeni ad" }), "product.updated", "p-6")).outcome, "changed");
  assert.equal((await db.select().from(schema.courses).where(eq(schema.courses.id, added.id)))[0].status, "archived");
});

test("active access is read through the same rule that tests time boundaries", async () => {
  const [grant] = await activeGrants("buyer");
  const inside = new Date(grant.startsAt.getTime() + DAY);
  assert.deepEqual((await activeCourseAccess(db, "buyer", inside)).map(a => a.courseId), [course.id]);
  assert.equal((await activeCourseAccess(db, "buyer", inside))[0].shopierProductId, "51075042");
  assert.equal((await activeGrant(db, "buyer", course.id, inside))?.courseId, course.id);
  assert.equal(await activeGrant(db, "buyer", other.id, inside), null, "a grant for course A never opens course B");
  assert.equal(await activeGrant(db, "buyer", course.id, grant.expiresAt), null, "expiry is exclusive");
  assert.deepEqual(await activeCourseAccess(db, "buyer", grant.expiresAt), []);
  assert.deepEqual(await activeCourseAccess(db, "buyer", new Date(grant.startsAt.getTime() - 1)), [], "access starts at payment time");
});

test("the catalog shows only published, sellable TRY courses and names every linked course for the owner", async () => {
  const { shopierProductSchema: schemaOf } = await import("../lib/shopier/api.ts");
  const product = (id, fields = {}) => schemaOf.parse({ id, title: `Ürün ${id}`, description: "<p>Açıklama</p>", type: "digital", customListing: false, stockStatus: "inStock",
    priceData: { currency: "TRY", price: "100.00" }, ...fields });
  await db.insert(schema.courses).values([
    { slug: "sat-1", shopierProductId: "80000001" },
    { slug: "sat-usd", shopierProductId: "80000002" },
    { slug: "sat-taslak", shopierProductId: "80000003", status: "draft" },
    { slug: "sat-gizli", shopierProductId: "80000004" },
    { slug: "sat-bedava", shopierProductId: "80000005" },
  ]);
  const products = [product("80000001"), product("80000002", { priceData: { currency: "USD", price: "5.00" } }), product("80000003"),
    product("80000004", { customListing: true }), product("80000005", { priceData: { currency: "TRY", price: "0" } })];
  const slugs = (list) => list.map(c => c.slug).filter(s => s.startsWith("sat-"));
  assert.deepEqual(slugs(await listCatalog(db, products)), ["sat-1", "sat-gizli"], "the site's own status decides, not the Shopier store listing");
  const found = await findCatalogCourse(db, "sat-1", async id => products.find(p => p.id === id) ?? null);
  assert.deepEqual([found.title, found.summary, found.priceKurus, found.shopierUrl], ["Ürün 80000001", "Açıklama", 10000, "https://www.shopier.com/80000001"]);
  assert.equal(await findCatalogCourse(db, "sat-usd", async id => products.find(p => p.id === id) ?? null), null);
  assert.equal(await findCatalogCourse(db, "sat-1", async () => null), null, "a deleted product is not for sale");
  const owner = await ownerCatalog(db, products);
  const row = slug => owner.courses.find(c => c.slug === slug);
  assert.deepEqual([row("sat-1").priceKurus, row("sat-usd").priceKurus, row("sat-taslak").title], [10000, null, "Ürün 80000003"]);
  assert.deepEqual(["sat-1", "sat-usd", "sat-taslak", "sat-gizli", "sat-bedava"].map(slug => row(slug).blocker), [null, "unpriced", null, null, "unpriced"]);
  assert.equal(row("kurs").title, "Shopier ürünü 51075042");
});

test("owner commands write their audit entry only when something changed, in the same transaction", async () => {
  const { setCourseStatus, setAccessDuration } = await import("../lib/akademi/owner-commands.ts");
  await db.insert(schema.owners).values({ userId: "student-b" });
  const audits = () => db.select().from(schema.adminAuditLog);
  const shopier = { updateProduct: async (_id, changes) => ({ customListing: changes.hidden }) };
  assert.equal(await setCourseStatus(db, "student-b", course.id, "draft", shopier), true);
  assert.equal(await setAccessDuration(db, "student-b", course.id, 90), true);
  assert.deepEqual((await audits()).map(a => [a.action, a.reason]), [["course.visibility_requested", "Shopier’den istendi: mağazadan gizle"], ["course.visibility_done", "Shopier’de yapıldı: mağazadan gizle"], ["course.draft", "Durum değiştirildi"], ["course.access_duration", "90 gün"]]);
  const missing = "00000000-0000-4000-8000-000000000000";
  assert.equal(await setCourseStatus(db, "student-b", missing, "draft", shopier), false);
  assert.equal(await setAccessDuration(db, "student-b", missing, 30), false);
  assert.equal((await audits()).length, 4, "no audit row for a course that does not exist");
  await assert.rejects(() => setAccessDuration(db, "student-b", course.id, 0));
  await assert.rejects(() => setCourseStatus(db, "no-such-user", course.id, "published", shopier));
  assert.equal((await db.select().from(schema.courses).where(eq(schema.courses.id, course.id)))[0].status, "draft", "a failed audit rolls the change back");
  await setCourseStatus(db, "student-b", course.id, "published", shopier);
});

test("the composed Akademi claims orders through Shopier, limits attempts and replays recent orders", async () => {
  const paid = order({ id: "990000001", shippingInfo: { email: "gift@example.com" } });
  const shopier = {
    getOrder: async (id) => id === paid.id ? paid : null,
    getProduct: async () => null,
    listProducts: async () => ({ products: [], ids: new Set(["51075042", "80000001", "80000002", "80000003", "80000004", "80000005", "60000001", "70000001", "70000005"]) }),
    listSucceededRefunds: async () => [],
    listOrdersSince: async () => [order({ id: "990000002", shippingInfo: { email: "c@example.com" } })],
  };
  const akademi = createAkademi({ db, shopier });
  assert.equal(await akademi.access.claimOrder("student-c", paid.id, "gift@example.com"), "granted");
  for (let attempt = 2; attempt <= 5; attempt++) assert.equal(await akademi.access.claimOrder("student-c", "123456", "gift@example.com"), "not_found");
  assert.equal(await akademi.access.claimOrder("student-c", paid.id, "gift@example.com"), "rate_limited");
  const replay = await akademi.access.replayRecentOrders();
  assert.deepEqual([replay.orders, replay.purchases, replay.granted], [1, 1, 1]);
  assert.deepEqual(await akademi.access.replayRecentOrders().then(r => r.granted), 0, "replays are idempotent");
});

test("a Shopier checkout fills only an empty phone and address; odd contact values never block the grant", async () => {
  await db.insert(schema.user).values([
    { id: "contact-new", name: "N", email: "contact-new@example.com", emailVerified: true },
    { id: "contact-set", name: "S", email: "contact-set@example.com", emailVerified: true, phone: "+905051112233", city: "Ankara", district: "Çankaya", address: "Kızılay Mah. Atatürk Blv. No: 1" },
    { id: "contact-claim", name: "C", email: "contact-claim@example.com", emailVerified: true },
  ]);
  const contactOf = async (id) => {
    const [row] = await db.select({ phone: schema.user.phone, city: schema.user.city, district: schema.user.district, address: schema.user.address, postcode: schema.user.postcode }).from(schema.user).where(eq(schema.user.id, id));
    return row;
  };
  // A landline in billing is skipped for the mobile in shipping; a postcode from another province is dropped.
  const checkout = { phone: "532 123 45 67", address: "Moda Cad. No: 12 Daire 3", district: "KADIKÖY", city: "ISTANBUL", postcode: "06100", country: "Türkiye" };
  assert.equal((await recordShopierOrder(db, order({ billingInfo: { phone: "0216 123 45 67" }, shippingInfo: { email: "contact-new@example.com", ...checkout } }))).granted, 1);
  assert.deepEqual(await contactOf("contact-new"), { phone: "+905321234567", city: "İstanbul", district: "Kadıköy", address: "Moda Cad. No: 12 Daire 3", postcode: null });

  const before = await contactOf("contact-set");
  await recordShopierOrder(db, order({ shippingInfo: { email: "contact-set@example.com", ...checkout } }));
  assert.deepEqual(await contactOf("contact-set"), before, "what the student entered is never overwritten");

  await db.update(schema.user).set({ district: null, city: null, address: null }).where(eq(schema.user.id, "contact-new"));
  await recordShopierOrder(db, order({ shippingInfo: { email: "contact-new@example.com", ...checkout, district: "Çankaya" } }));
  assert.equal((await contactOf("contact-new")).city, null, "a district outside the province leaves the address for the student");

  const odd = order({ shippingInfo: { email: "contact-new@example.com", phone: { nested: true }, city: 34 } });
  assert.equal((await recordShopierOrder(db, odd)).granted, 1);

  const gift = order({ shippingInfo: { email: "gift-contact@example.com", ...checkout, postcode: "34710" } });
  assert.equal(await claimShopierOrder(db, gift, "gift-contact@example.com", "contact-claim"), "granted");
  assert.deepEqual(await contactOf("contact-claim"), { phone: "+905321234567", city: "İstanbul", district: "Kadıköy", address: "Moda Cad. No: 12 Daire 3", postcode: "34710" }, "claiming by order number adopts the checkout contact too");
});

test("a bundle purchase grants every included course for the bundle's duration and splits the total", async () => {
  const { setBundleCourses } = await import("../lib/akademi/owner-commands.ts");
  const { recordShopierRefund } = await import("../lib/akademi/refunds.ts");
  const { shopierRefundSchema } = await import("../lib/shopier/api.ts");
  await db.insert(schema.user).values([{ id: "bundle-buyer", name: "P", email: "bundle@example.com", emailVerified: true }, { id: "owner", name: "O", email: "owner@example.com", emailVerified: true }]);
  const [bundle, a, b, c] = await db.insert(schema.courses).values([
    { slug: "lansman-paket", accessDurationDays: 90, shopierProductId: "91000000" },
    ...["91000001", "91000002", "91000003"].map(id => ({ slug: `paket-${id}`, accessDurationDays: 30, shopierProductId: id })),
  ]).returning();
  await assert.rejects(() => setBundleCourses(db, "owner", bundle.id, [bundle.id]), /kendisini/);
  assert.equal(await setBundleCourses(db, "owner", bundle.id, [a.id, b.id, c.id]), true);
  await assert.rejects(() => setBundleCourses(db, "owner", a.id, [b.id]), /başka bir paketin/, "an included course cannot become a bundle");
  await assert.rejects(() => setBundleCourses(db, "owner", other.id, [bundle.id]), /başka bir paketin/, "a bundle cannot be included");

  const email = { shippingInfo: { email: "bundle@example.com" } };
  // The bundle and one of its courses in the same order: one purchase per course.
  const paid = order({ ...email, lineItems: [{ productId: "91000000", total: "1000.00" }, { productId: "91000001", total: "50.00" }] });
  assert.equal((await recordShopierOrder(db, paid)).granted, 3);
  assert.equal((await recordShopierOrder(db, paid)).granted, 0);
  const purchases = await db.select().from(schema.shopierPurchases).where(eq(schema.shopierPurchases.shopierOrderId, paid.id));
  assert.equal(purchases.length, 3);
  assert.equal(purchases.reduce((sum, p) => sum + p.amountKurus, 0), 105000, "the split loses no kuruş");
  assert.ok(purchases.every(p => p.amountKurus >= 33333));
  assert.ok(purchases.every(p => p.bundleId === bundle.id && p.accessDurationDays === 90));
  const inside = new Date(paid.dateCreated.getTime() + 60 * DAY);
  assert.deepEqual((await activeCourseAccess(db, "bundle-buyer", inside)).map(g => g.courseId).sort(), [a.id, b.id, c.id].sort());
  assert.equal(await activeGrant(db, "bundle-buyer", bundle.id, inside), null, "the bundle itself is not a course to open");

  const { courses: owned } = await ownerCatalog(db, []);
  const row = owned.find(item => item.id === bundle.id);
  assert.deepEqual([row.includes.length, row.sales, row.inBundle], [3, 1, false]);
  assert.equal(owned.find(item => item.id === a.id).inBundle, true);

  // A full refund of the order closes all three.
  await recordShopierRefund(db, shopierRefundSchema.parse({ id: "88000001", orderId: paid.id, status: "succeeded", type: "full", dateCreated: "2026-09-22T10:00:00+0300", currency: "TRY", total: "1050.00" }));
  assert.deepEqual(await activeCourseAccess(db, "bundle-buyer", inside), []);

  // Emptied, the product sells as an ordinary course again.
  await setBundleCourses(db, "owner", bundle.id, []);
  await recordShopierOrder(db, order({ ...email, lineItems: [{ productId: "91000000", total: "10.00" }] }));
  assert.deepEqual((await activeCourseAccess(db, "bundle-buyer", inside)).map(g => g.courseId), [bundle.id]);
});
