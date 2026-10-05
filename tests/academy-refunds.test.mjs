import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { shopierOrderSchema, shopierRefundSchema, createShopierClient } from "../lib/shopier/api.ts";
import { recordShopierOrder, claimShopierOrder, claimPurchasesByEmail, claimPurchase } from "../lib/akademi/course-access.ts";
import { recordShopierRefund } from "../lib/akademi/refunds.ts";
import { handleShopierWebhook } from "../lib/akademi/shopier-webhook.ts";
import { verifyShopierDelivery } from "../lib/akademi/delivery-verification.ts";
import { createAkademi } from "../lib/akademi/akademi.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
const DAY = 86_400_000;
let sequence = 800000000;
before(() => migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname }));
after(() => client.close());

async function fixture(verified = true) {
  const id = String(sequence++);
  await db.insert(schema.user).values({ id, name: "Student", email: `${id}@example.com`, emailVerified: verified });
  const [course] = await db.insert(schema.courses).values({ slug: `course-${id}`, shopierProductId: id, accessDurationDays: 30 }).returning();
  const order = (day = 1) => shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: `2026-10-${String(day).padStart(2, "0")}T10:00:00+0300`, currency: "TRY",
    billingInfo: { email: `${id}@example.com` }, lineItems: [{ productId: id, total: "100.00" }] });
  return { id, course, order, current: async () => (await db.select().from(schema.courseAccess).where(and(eq(schema.courseAccess.userId, id), eq(schema.courseAccess.courseId, course.id), isNull(schema.courseAccess.revokedAt))))[0] };
}
const refund = (order, fields = {}) => shopierRefundSchema.parse({ id: String(sequence++), orderId: order.id, status: "succeeded", type: "full", currency: "TRY", total: "100.00", dateCreated: "2026-10-04T10:00:00+0300", dateRefunded: "2026-10-04T10:01:00+0300", ...fields });
async function deliver(event, payload, deliveryId = String(sequence++), token = "token") {
  const body = JSON.stringify(payload);
  return handleShopierWebhook(db, body, new Headers({ "shopier-event": event, "shopier-webhook-id": deliveryId,
    "shopier-signature": createHmac("sha256", token).update(body).digest("hex") }), ["token"]);
}

test("signed purchase delivery records a receipt, grants access once and can be verified read-only", async () => {
  const f = await fixture(), order = f.order();
  assert.equal((await verifyShopierDelivery(db, order)).verified, false);
  assert.equal((await deliver("order.created", order, "delivery-proof", "wrong")).status, 401);
  assert.equal((await verifyShopierDelivery(db, order)).webhookProcessed, false);
  assert.equal((await deliver("order.created", order, "delivery-proof")).outcome, "recorded");
  const proof = await verifyShopierDelivery(db, order);
  assert.deepEqual([proof.webhookProcessed, proof.purchaseRecorded, proof.accessRecorded, proof.verified], [true, true, true, true]);
  assert.equal((await deliver("order.created", order, "delivery-proof")).outcome, "duplicate");
  const current = await f.current();
  assert.equal(current.expiresAt.getTime(), order.dateCreated.getTime() + 30 * DAY);
  assert.equal((await db.select().from(schema.shopierPurchases).where(eq(schema.shopierPurchases.shopierOrderId, order.id))).length, 1);
});

test("a sync or manual claim alone never proves webhook delivery", async () => {
  const f = await fixture(), order = f.order();
  await recordShopierOrder(db, order);
  const proof = await verifyShopierDelivery(db, order);
  assert.equal(proof.accessRecorded, true);
  assert.equal(proof.webhookProcessed, false);
  assert.equal(proof.verified, false);
});

test("successful full refund revokes access, rejects reclaims and ignores stale paid replays", async () => {
  const f = await fixture(), order = f.order(), returned = refund(order);
  await deliver("order.created", order);
  assert.equal((await deliver("refund.updated", returned, "refund-duplicate", "wrong")).status, 401);
  assert.ok(await f.current());
  assert.equal((await deliver("refund.updated", returned, "refund-duplicate")).outcome, "refunded");
  assert.equal(await f.current(), undefined);
  assert.equal((await deliver("refund.updated", returned, "refund-duplicate")).outcome, "duplicate");
  await deliver("order.created", order);
  assert.equal(await f.current(), undefined);
  assert.equal(await claimShopierOrder(db, order, `${f.id}@example.com`, f.id), "refunded");
  const proof = await verifyShopierDelivery(db, order);
  assert.equal(proof.fullRefundRecorded, true);
  assert.equal(proof.verified, false);
});

test("refund before order or email verification never grants a refunded course", async () => {
  const f = await fixture(false), order = f.order();
  await deliver("refund.updated", refund(order));
  await deliver("order.created", order);
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, f.id));
  assert.equal(await claimPurchasesByEmail(db, f.id, `${f.id}@example.com`), 0);
  assert.equal(await f.current(), undefined);
});

test("purchase before registration grants after verification; delayed notification can be claimed", async () => {
  const f = await fixture(false), order = f.order();
  await deliver("order.created", order);
  assert.equal(await f.current(), undefined);
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, f.id));
  assert.equal(await claimPurchasesByEmail(db, f.id, `${f.id}@example.com`), 1);
  assert.equal((await verifyShopierDelivery(db, order)).verified, true);
  const late = await fixture(), lateOrder = late.order();
  assert.equal(await claimShopierOrder(db, lateOrder, `${late.id}@example.com`, late.id), "already_yours");
  assert.ok(await late.current());
  assert.equal(await claimShopierOrder(db, lateOrder, `${late.id}@example.com`, f.id), "claimed_by_other");
});

test("a buyer can register after paying and claim the waiting purchase", async () => {
  const f = await fixture(), email = `new-${sequence++}@example.com`, userId = String(sequence++);
  const order = { ...f.order(), billingInfo: { email } };
  await deliver("order.created", order);
  assert.equal((await verifyShopierDelivery(db, order)).unclaimedCourses, 1);
  await db.insert(schema.user).values({ id: userId, name: "New student", email, emailVerified: true });
  assert.equal(await claimPurchasesByEmail(db, userId, email), 1);
  assert.equal((await verifyShopierDelivery(db, order)).verified, true);
});

test("refund of an extension preserves the earlier paid access and a new purchase can extend it", async () => {
  const f = await fixture(), first = f.order(), second = f.order(2);
  await recordShopierOrder(db, first);
  await recordShopierOrder(db, second);
  assert.equal((await f.current()).expiresAt.getTime(), first.dateCreated.getTime() + 60 * DAY);
  await recordShopierRefund(db, refund(second));
  assert.equal((await f.current()).expiresAt.getTime(), first.dateCreated.getTime() + 30 * DAY);
  await recordShopierOrder(db, f.order(3));
  assert.equal((await f.current()).expiresAt.getTime(), first.dateCreated.getTime() + 60 * DAY);
});

test("a refund that ends access erases lesson progress; one that leaves an earlier purchase keeps it", async () => {
  const f = await fixture(), first = f.order(), second = f.order(2);
  const [module] = await db.insert(schema.modules).values({ courseId: f.course.id, title: "Module" }).returning();
  const [lesson] = await db.insert(schema.lessons).values({ courseId: f.course.id, moduleId: module.id, slug: "lesson", title: "Lesson", kind: "video" }).returning();
  const other = await fixture();
  const [otherModule] = await db.insert(schema.modules).values({ courseId: other.course.id, title: "Module" }).returning();
  const [otherLesson] = await db.insert(schema.lessons).values({ courseId: other.course.id, moduleId: otherModule.id, slug: "lesson", title: "Lesson", kind: "video" }).returning();
  await db.insert(schema.lessonProgress).values([lesson, otherLesson].map(l => ({ userId: f.id, lessonId: l.id, lastPositionSeconds: 90, completedAt: new Date() })));
  const progress = async () => (await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, f.id))).map(row => row.lessonId);
  await recordShopierOrder(db, first);
  await recordShopierOrder(db, second);
  await recordShopierRefund(db, refund(second));
  assert.equal((await progress()).length, 2, "the first purchase still gives access");
  await recordShopierRefund(db, refund(first));
  assert.deepEqual(await progress(), [otherLesson.id], "only the refunded course is forgotten");
});

test("refund of an earlier purchase removes only its days, including through three extensions", async () => {
  const f = await fixture(), first = f.order(), second = f.order(2), third = f.order(3);
  for (const order of [first, second, third]) await recordShopierOrder(db, order);
  await recordShopierRefund(db, refund(first));
  let current = await f.current();
  assert.equal(current.startsAt.getTime(), second.dateCreated.getTime());
  assert.equal(current.expiresAt.getTime(), second.dateCreated.getTime() + 60 * DAY);
  await recordShopierRefund(db, refund(second));
  current = await f.current();
  assert.equal(current.startsAt.getTime(), third.dateCreated.getTime());
  assert.equal(current.expiresAt.getTime(), third.dateCreated.getTime() + 30 * DAY);
  await recordShopierRefund(db, refund(third));
  assert.equal(await f.current(), undefined);
});

test("pending, failed and partial refunds preserve access; partials appear for owner review", async () => {
  const f = await fixture(), order = f.order();
  await recordShopierOrder(db, order);
  const grantId = (await f.current()).id;
  for (const status of ["pending", "failed"]) assert.equal((await deliver("refund.updated", refund(order, { status }))).outcome, "refund_pending_or_failed");
  assert.equal((await deliver("refund.updated", refund(order, { type: "partial", total: "10.00" }))).outcome, "partial_refund_review");
  assert.equal((await f.current()).id, grantId);
  const akademi = createAkademi({ db, shopier: { listProducts: async () => ({ products: [], ids: new Set() }) } });
  assert.ok((await akademi.owner.catalogSnapshot()).refundReviews.some(r => r.orderId === order.id));
});

test("refunds preserve independent owner grants and restore an owner grant extended by a purchase", async () => {
  const f = await fixture();
  await db.insert(schema.owners).values({ userId: f.id });
  const [owner] = await db.insert(schema.courseAccess).values({ userId: f.id, courseId: f.course.id, grantedBy: f.id, grantReason: "Owner gift",
    startsAt: new Date("2026-10-01"), expiresAt: new Date("2026-11-01") }).returning();
  const order = f.order(2);
  await recordShopierOrder(db, order);
  await recordShopierRefund(db, refund(order));
  assert.equal((await f.current()).id, owner.id);
  assert.equal((await f.current()).expiresAt.getTime(), owner.expiresAt.getTime());
  const unrelated = f.order(3);
  await db.insert(schema.shopierPurchases).values({ shopierOrderId: unrelated.id, courseId: f.course.id, buyerEmail: `${f.id}@example.com`, amountKurus: 10000, currency: "TRY", accessDurationDays: 30, purchasedAt: unrelated.dateCreated, userId: f.id, claimedAt: new Date() });
  await recordShopierRefund(db, refund(unrelated));
  assert.equal((await f.current()).id, owner.id);
});

test("a refund never restores a manually revoked grant", async () => {
  const f = await fixture(), order = f.order();
  await recordShopierOrder(db, order);
  const current = await f.current();
  await db.update(schema.courseAccess).set({ revokedAt: new Date(), revocationReason: "owner_revoked" }).where(eq(schema.courseAccess.id, current.id));
  await recordShopierRefund(db, refund(order));
  assert.equal(await f.current(), undefined);
});

test("concurrent refund and claim cannot leave refunded access active", async () => {
  const f = await fixture(false), order = f.order();
  const recorded = await recordShopierOrder(db, order);
  await Promise.all([claimPurchase(db, recorded.purchaseIds[0], f.id), recordShopierRefund(db, refund(order))]);
  assert.equal(await f.current(), undefined);
});

test("reconciliation handles recent refunds of old orders; claims fail closed when refunds cannot be checked", async () => {
  const f = await fixture(), oldOrder = f.order();
  await recordShopierOrder(db, oldOrder);
  const returned = refund(oldOrder);
  const shopier = { listSucceededRefunds: async () => [returned], listOrdersSince: async () => [], listProducts: async () => ({ products: [], ids: new Set([f.course.shopierProductId]) }) };
  const akademi = createAkademi({ db, shopier });
  assert.equal((await akademi.access.replayRecentOrders()).refunds, 1);
  assert.equal(await f.current(), undefined);
  assert.equal((await akademi.access.replayRecentOrders()).refunds, 1, "a second replay skips the stored refund");
  assert.equal((await db.select().from(schema.shopierRefunds).where(eq(schema.shopierRefunds.shopierOrderId, oldOrder.id))).length, 1);
  const broken = createAkademi({ db, shopier: { ...shopier, getOrder: async () => f.order(), listSucceededRefunds: async () => { throw new Error("unavailable"); } } });
  await assert.rejects(() => broken.access.claimOrder(f.id, "123", `${f.id}@example.com`), /unavailable/);
  await assert.rejects(() => broken.access.replayRecentOrders(), /unavailable/);
});

test("the dashboard reports completed refunds in total and on the day Shopier completed them", async () => {
  const { ownerDashboard, dashboardRange, chartSeries } = await import("../lib/akademi/dashboard.ts");
  const f = await fixture(), order = f.order();
  await recordShopierOrder(db, order);
  await recordShopierRefund(db, refund(order, { dateRefunded: "2031-03-10T10:00:00+0300" }));
  const range = dashboardRange({ period: "custom", from: "2031-03-09", to: "2031-03-11" }, new Date("2031-04-01T12:00:00+0300"));
  const data = await ownerDashboard(db, range);
  assert.deepEqual(data.refunds, { amount: 10000, count: 1 });
  assert.deepEqual(chartSeries(range, data.activity, data.refundActivity).points.map(point => [point.day, point.amount, point.refunded]),
    [["2031-03-09", 0, 0], ["2031-03-10", 0, 10000], ["2031-03-11", 0, 0]]);
  const next = dashboardRange({ period: "custom", from: "2031-03-12", to: "2031-03-14" }, new Date("2031-04-01T12:00:00+0300"));
  assert.deepEqual((await ownerDashboard(db, next)).previous, { days: 3, gross: 0, orders: 0, refunded: 10000, newUsers: 0 }, "the three days before the range");
});

test("refund API paginates, ignores unsuccessful refunds and rejects truncation", async () => {
  const f = await fixture(), order = f.order(), calls = [];
  const api = createShopierClient("token", async url => { calls.push(url); return Response.json(url.includes("page=1") ? Array.from({ length: 50 }, () => refund(order)) : [refund(order, { status: "failed" }), refund(order)]); });
  assert.equal((await api.listSucceededRefunds()).length, 51);
  assert.equal(calls.length, 2);
  await assert.rejects(() => api.listSucceededRefunds({ maxPages: 1 }), /page limit/);
  await api.listSucceededRefunds({ orderId: order.id });
  assert.match(calls.at(-1), new RegExp(`&orderId=${order.id}$`), "a claim asks Shopier for one order's refunds");
});

test("migration backfills historical extension links from proven dates", async () => {
  const f = await fixture(), first = f.order(), second = f.order(2);
  await recordShopierOrder(db, first);
  const previous = await f.current();
  await recordShopierOrder(db, second);
  const current = await f.current();
  await db.update(schema.courseAccess).set({ extendedFromId: null }).where(eq(schema.courseAccess.id, current.id));
  const sql = await readFile(new URL("../drizzle/0016_shopier_refunds_and_delivery.sql", import.meta.url), "utf8");
  await client.exec(sql.slice(sql.indexOf("UPDATE course_access AS next_grant")));
  assert.equal((await f.current()).extendedFromId, previous.id);
  await recordShopierRefund(db, refund(second));
  assert.equal((await f.current()).expiresAt.getTime(), previous.expiresAt.getTime());
});
