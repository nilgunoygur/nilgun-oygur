import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { shopierOrderSchema, isValidWebhookSignature, toKurus, parseShopierProduct, createShopierClient } from "../lib/shopier/api.ts";
import { recordShopierOrder, claimPurchase, claimPurchasesByEmail, claimShopierOrder } from "../lib/akademi/purchases.ts";

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
    { slug: "kurs", title: "Kurs", priceKurus: 100, accessDurationDays: 30, shopierProductId: "51075042", shopierUrl: "https://www.shopier.com/51075042", status: "published" },
    { slug: "diger", title: "Diğer", priceKurus: 200, accessDurationDays: 10, shopierProductId: "51075057", shopierUrl: "https://www.shopier.com/51075057", status: "published" },
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
  await assert.rejects(() => db.insert(schema.courses).values({ slug: "unsellable", title: "X", priceKurus: 1, status: "published" }));
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
  const { handleShopierWebhook } = await import("../lib/akademi/shopier-webhook.ts");
  const body = JSON.stringify({ id: "555000111", paymentStatus: "paid", dateCreated: "2026-09-21T12:00:00+0300", currency: "TRY", shippingInfo: { email: "c@example.com" }, lineItems: [{ productId: "51075057", total: "2.00" }] });
  const sign = (raw, token = "hook-token") => createHmac("sha256", token).update(raw).digest("hex");
  const headers = (raw, extra = {}) => new Headers({ "shopier-event": "order.created", "shopier-webhook-id": "wh-1", "shopier-signature": sign(raw), ...extra });
  assert.deepEqual(await handleShopierWebhook(db, body, headers(body, { "shopier-signature": sign(body, "wrong") }), ["hook-token"]), { status: 401, outcome: "invalid_signature" });
  assert.equal((await handleShopierWebhook(db, body, headers(body, { "shopier-event": "refund.updated" }), ["hook-token"])).outcome, "ignored_event");
  assert.deepEqual(await handleShopierWebhook(db, body, headers(body), ["hook-token"]), { status: 200, outcome: "recorded" });
  assert.deepEqual(await handleShopierWebhook(db, body, headers(body), ["hook-token"]), { status: 200, outcome: "duplicate" });
  assert.equal((await activeGrants("student-c")).filter(g => g.courseId === other.id).length, 1);
  const broken = '{"id":"1"}';
  assert.deepEqual(await handleShopierWebhook(db, broken, headers(broken, { "shopier-webhook-id": "wh-2" }), ["hook-token"]), { status: 500, outcome: "failed" });
  const [failed] = await db.select().from(schema.providerEvents).where(eq(schema.providerEvents.eventIdentity, "order.created:wh-2"));
  assert.equal(failed.status, "failed");
  assert.ok(!failed.errorDetails.includes("c@example.com"));
});

test("course details are read from the public Shopier product page", async () => {
  const { parseShopierProductPage } = await import("../lib/shopier/public-product.ts");
  const { parsePriceKurus } = await import("../lib/shopier/api.ts");
  const { syncCourseFromShopier, syncCatalogFromShopier } = await import("../lib/akademi/course-sync.ts");
  const { parseShopierStorePage } = await import("../lib/shopier/public-product.ts");
  assert.equal(parsePriceKurus("950"), 95000);
  assert.equal(parsePriceKurus("2.490,50"), 249050);
  assert.equal(parsePriceKurus("2490.5"), 249050);
  assert.equal(parsePriceKurus("abc"), null);
  const page = (title, price, image = "https://cdn.shopier.app/pictures_large/a.jpg", currency = "TRY") => `<html><head>
    <meta property="og:title" content="${title}"/><meta property="og:description" content="Kısa &amp; öz açıklama"/>
    <meta property="og:image" content="${image}"/><meta property="product:price:amount" content="${price}"/>
    <meta property="product:price:currency" content="${currency}"/></head></html>`;
  assert.deepEqual(parseShopierProductPage(page("Doğal Taş Eğitimi", "950")), { title: "Doğal Taş Eğitimi", description: "Kısa & öz açıklama", imageUrl: "https://cdn.shopier.app/pictures_large/a.jpg", priceKurus: 95000, compareAtPriceKurus: null, currency: "TRY" });
  const sale = page("İndirimli", "4") + '<div class="product-price-old shopier-store--product-price-old" data-price="5,00 TL">';
  assert.equal(parseShopierProductPage(sale).compareAtPriceKurus, 500);
  assert.equal(parseShopierProductPage(page("X", "6") + '<div class="product-price-old" data-price="5,00 TL">').compareAtPriceKurus, null);
  assert.equal(parseShopierProductPage(page("X", "950", "https://evil.example/x.jpg")).imageUrl, null);
  assert.equal(parseShopierProductPage("<html>Not found</html>"), null);

  const card = (id, digital) => `<div class="product-card shopier--product-card"><a data-back-id="${id}"><div class="product-card-header"></div><div class="product-card-body">${digital ? '<span class="badge">Dijital ürün</span>' : ""}</div></a></div>`;
  assert.deepEqual(parseShopierStorePage(card("111111", true) + card("222222", false) + card("111111", true)), [{ id: "111111", digital: true }, { id: "222222", digital: false }]);

  // Store lists one new digital product and one physical one; 51075057 has been deleted in Shopier.
  const pages = {
    "store": `<div id="shopier--product-list-section">${card("51075042", true)}${card("60000001", true)}${card("60000002", false)}</div>`,
    "51075042": page("Yeni Başlık", "2490"), "60000001": page("Yeni Kurs", "300"), "60000002": page("Kitap", "100"),
  };
  const fake = async (url) => {
    const key = url.endsWith("/TestStore") ? "store" : url.split("/").pop();
    if (key === "51075057") return redirectTo("https://www.shopier.com/s/notfound/1");
    return pages[key] ? new Response(pages[key]) : new Response("", { status: 503 });
  };
  const redirectTo = (target) => { const response = new Response("<html></html>"); Object.defineProperty(response, "redirected", { value: true }); Object.defineProperty(response, "url", { value: target }); return response; };
  assert.equal(await syncCourseFromShopier(db, course.id, fake), "updated");
  assert.equal(await syncCourseFromShopier(db, course.id, fake), "unchanged");
  const [synced] = await db.select().from(schema.courses).where(eq(schema.courses.id, course.id));
  assert.equal(synced.title, "Yeni Başlık");
  assert.equal(synced.priceKurus, 249000);
  assert.equal(synced.cover, "https://cdn.shopier.app/pictures_large/a.jpg");
  const result = await syncCatalogFromShopier(db, "TestStore", fake);
  assert.deepEqual({ added: result.added, archived: result.archived, unchanged: result.unchanged, failed: result.failed }, { added: 1, archived: 1, unchanged: 2, failed: 0 });
  const bySlug = Object.fromEntries((await db.select().from(schema.courses)).map(c => [c.slug, c]));
  assert.equal(bySlug["yeni-kurs"].status, "published");
  assert.equal(bySlug["yeni-kurs"].priceKurus, 30000);
  assert.equal(bySlug["kitap"], undefined);
  assert.equal(bySlug["diger"].status, "archived");
  // A store outage never archives anything.
  await assert.rejects(() => syncCatalogFromShopier(db, "TestStore", async () => new Response("", { status: 503 })));
  assert.equal((await syncCourseFromShopier(db, course.id, async () => { throw new Error("timeout"); })), "unavailable");
});

test("product webhooks publish new visible digital products and keep linked courses current", async () => {
  const { handleShopierWebhook } = await import("../lib/akademi/shopier-webhook.ts");
  const product = (fields) => JSON.stringify({ id: "70000001", title: "Kuantum Eğitimi", description: "Açıklama", type: "digital", customListing: false,
    media: [{ type: "image", url: "https://cdn.shopier.app/pictures_large/k.jpg", placement: 1 }],
    priceData: { currency: "TRY", price: "2490.00", discount: false, discountedPrice: "" }, ...fields });
  const send = (raw, event, id) => handleShopierWebhook(db, raw, new Headers({ "shopier-event": event, "shopier-webhook-id": id, "shopier-signature": createHmac("sha256", "product-token").update(raw).digest("hex") }), ["order-token", "product-token"]);
  assert.deepEqual(await send(product({}), "product.created", "p-1"), { status: 200, outcome: "added" });
  const [added] = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000001"));
  assert.equal(added.status, "published");
  assert.equal(added.slug, "kuantum-egitimi");
  assert.equal(added.priceKurus, 249000);
  assert.equal(added.cover, "https://cdn.shopier.app/pictures_large/k.jpg");
  const onSale = product({ priceData: { currency: "TRY", price: "2490.00", discount: true, discountedPrice: "1990.00" } });
  assert.equal((await send(onSale, "product.updated", "p-2")).outcome, "updated");
  const [sale] = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000001"));
  assert.deepEqual([sale.priceKurus, sale.compareAtPriceKurus], [199000, 249000]);
  assert.equal((await send(product({ id: "70000002", customListing: true }), "product.created", "p-3")).outcome, "ignored");
  assert.equal((await send(product({ id: "70000003", type: "physical" }), "product.created", "p-4")).outcome, "ignored");
  await db.update(schema.courses).set({ status: "archived" }).where(eq(schema.courses.id, sale.id));
  assert.equal((await send(product({ title: "Yeni ad" }), "product.updated", "p-5")).outcome, "updated");
  const [stillArchived] = await db.select().from(schema.courses).where(eq(schema.courses.id, sale.id));
  assert.equal(stillArchived.status, "archived");
});
