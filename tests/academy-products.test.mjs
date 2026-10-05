import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { createShopierClient, ShopierError } from "../lib/shopier/api.ts";
import { createCourse, setCourseStatus, updateCourseProduct, OwnerInputError } from "../lib/akademi/owner-commands.ts";
import { applyShopierProduct, ownerCatalog } from "../lib/akademi/catalog.ts";
import { productFormSchema, productChangeSchema } from "../lib/akademi/owner-forms.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values({ id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true });
});
after(() => client.close());

const product = (fields = {}) => ({
  id: "70000001", title: "Nefes Eğitimi", description: "<p>İlk</p>", type: "digital", url: "https://www.shopier.com/70000001",
  media: [{ url: "https://cdn.shopier.app/pictures_large/a.png", placement: 1 }],
  priceData: { currency: "TRY", price: "950.00", discount: false, discountedPrice: "950.00" }, stockStatus: "inStock", customListing: false, ...fields,
});
const audits = async () => (await db.select().from(schema.adminAuditLog).orderBy(schema.adminAuditLog.createdAt)).map(row => row.action);
function fakeShopier(current = product()) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method ?? "GET", path: url.replace("https://api.shopier.com/v1", ""), body });
    return Response.json({ ...current, ...(body?.customListing !== undefined && { customListing: body.customListing }) });
  };
  return { shopier: createShopierClient("token", fetcher), calls };
}

test("the client creates a digital TRY product and updates only the fields it is given", async () => {
  const { shopier, calls } = fakeShopier();
  await shopier.createProduct({ title: " Nefes Eğitimi ", description: "<p>İlk</p>", priceKurus: 95000, discountedPriceKurus: 75050, imageUrl: "https://files.example/cover.jpg", hidden: true });
  await shopier.createProduct({ title: "İndirimsiz", description: "", priceKurus: 10000, imageUrl: "https://files.example/cover.jpg" });
  assert.deepEqual(calls.pop().body.priceData, { currency: "TRY", price: "100.00", discount: false });
  assert.deepEqual(calls[0], { method: "POST", path: "/products", body: {
    title: "Nefes Eğitimi", description: "<p>İlk</p>", priceData: { currency: "TRY", price: "950.00", discount: true, discountedPrice: "750.50" },
    media: [{ type: "image", url: "https://files.example/cover.jpg", placement: 1 }], customListing: true, type: "digital", shippingPayer: "sellerPays", stockQuantity: 10000,
  } });
  await shopier.updateProduct("70000001", { priceKurus: 120000, discountedPriceKurus: 99000 });
  assert.deepEqual(calls[1], { method: "PUT", path: "/products/70000001", body: { priceData: { price: "1200.00", discount: true, discountedPrice: "990.00" } } });
  await shopier.updateProduct("70000001", { priceKurus: 120000, discountedPriceKurus: null, inStock: false, hidden: false, title: "Yeni ad" });
  assert.deepEqual(calls[2].body, { title: "Yeni ad", priceData: { price: "1200.00", discount: false }, customListing: false, stockQuantity: 0 });
  await shopier.updateProduct("70000001", { title: "Yalnızca ad" });
  assert.deepEqual(calls[3].body, { title: "Yalnızca ad" }, "untouched fields are not sent");
  await assert.rejects(() => shopier.updateProduct("70000001", { priceKurus: 120000 }), /together/);
  await assert.rejects(() => shopier.updateProduct("70000001", { discountedPriceKurus: null }), /together/);
  await assert.rejects(() => shopier.updateProduct("../orders", { title: "x" }));
  await assert.rejects(() => shopier.updateProduct("70000001", { priceKurus: 50, discountedPriceKurus: null }), /price/);
  assert.equal(calls.length, 4, "invalid changes never reach Shopier");
});

test("a refused write carries Shopier's status and the start of its answer", async () => {
  const shopier = createShopierClient("token", async () => new Response('{"message":"media url is not reachable"}', { status: 400 }));
  await assert.rejects(() => shopier.updateProduct("70000001", { title: "x" }), error => error instanceof ShopierError && error.status === 400 && error.detail.includes("not reachable"));
});

test("creating a course makes the Shopier product, links it with the owner's settings and audits each step", async () => {
  const { shopier } = fakeShopier();
  const input = { title: "Nefes Eğitimi", description: "<p>İlk</p>", priceKurus: 95000, imageUrl: "https://files.example/cover.jpg", hidden: false, accessDurationDays: 180, status: "draft" };
  const { courseId } = await createCourse(db, "owner", input, shopier);
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId));
  assert.deepEqual([course.slug, course.shopierProductId, course.status, course.accessDurationDays], ["nefes-egitimi", "70000001", "draft", 180]);
  assert.deepEqual(await audits(), ["course.create_requested", "course.create_done", "course.linked"]);
  // Shopier's product.created webhook for the same product adds no second course.
  assert.equal(await applyShopierProduct(db, product()), "changed");
  assert.equal((await db.select().from(schema.courses)).length, 1);
});

test("the owner's settings win when Shopier's webhook linked the new product first", async () => {
  const late = product({ id: "70000002", title: "Geç Kalan" });
  assert.equal(await applyShopierProduct(db, late), "added");
  const { courseId } = await createCourse(db, "owner", { title: "Geç Kalan", description: "", priceKurus: 10000, imageUrl: "https://files.example/c.png", accessDurationDays: 30, status: "draft" }, fakeShopier(late).shopier);
  const rows = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000002"));
  assert.deepEqual(rows.map(row => [row.id, row.status, row.accessDurationDays]), [[courseId, "draft", 30]]);
});

test("editing a product checks the discount against the price it will sit beside and records intent and outcome", async () => {
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, "70000001"));
  await db.delete(schema.adminAuditLog);
  const { shopier, calls } = fakeShopier();
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, {}, shopier), OwnerInputError);
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, { discountedPriceKurus: 95000 }, shopier), /düşük/);
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, { priceKurus: 70000 }, fakeShopier(product({ priceData: { currency: "TRY", price: "950.00", discount: true, discountedPrice: "750.00" } })).shopier), /düşük/);
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, { title: "x" }, fakeShopier(product({ type: "physical" })).shopier), OwnerInputError);
  assert.deepEqual(await audits(), [], "nothing is recorded for a change that never left the site");
  await updateCourseProduct(db, "owner", course.id, { title: "Nefes ve Gevşeme", discountedPriceKurus: 75000 }, shopier);
  const discounted = fakeShopier(product({ priceData: { currency: "TRY", price: "950.00", discount: true, discountedPrice: "750.00" } }));
  await updateCourseProduct(db, "owner", course.id, { priceKurus: 99000 }, discounted.shopier);
  await updateCourseProduct(db, "owner", course.id, { inStock: true }, discounted.shopier);
  assert.deepEqual([...calls, ...discounted.calls].filter(call => call.method === "PUT").map(call => call.body), [
    { title: "Nefes ve Gevşeme", priceData: { price: "950.00", discount: true, discountedPrice: "750.00" } },
    { priceData: { price: "990.00", discount: true, discountedPrice: "750.00" } },
    { stockQuantity: 10000 },
  ], "a change to the price or the discount sends both, with the current value of the other");
  await db.delete(schema.adminAuditLog);
  await updateCourseProduct(db, "owner", course.id, { hidden: true }, shopier);
  const failing = { getProduct: async () => product(), updateProduct: async () => { throw new ShopierError(500, "down"); } };
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, { inStock: false }, failing), ShopierError);
  assert.deepEqual(await audits(), ["course.product_change_requested", "course.product_change_done", "course.product_change_requested", "course.product_change_failed"]);
});

test("the owner catalog carries what the edit form needs, in the owner's plain-text description format", async () => {
  const rich = product({ description: "<h3>Program</h3><p>Bir<br>İki</p>", customListing: true, priceData: { currency: "TRY", price: "950.00", discount: true, discountedPrice: "750.00" } });
  const { courses } = await ownerCatalog(db, [rich]);
  const row = courses.find(course => course.productId === "70000001");
  assert.deepEqual(row.product, { description: "### Program\n\nBir\nİki", listPriceKurus: 95000, image: "https://cdn.shopier.app/pictures_large/a.png", hidden: true, inStock: true, url: "https://www.shopier.com/70000001" });
  assert.deepEqual([row.priceKurus, row.discounted], [75000, true]);
  assert.equal(courses.find(course => course.productId === "70000002").product, null, "a product missing from Shopier cannot be edited");
});

test("product forms accept lira amounts, treat an empty discount as none and send partial edits", () => {
  const form = { title: " Nefes ", description: "", price: "950,5".replace(",", "."), discountedPrice: "", listed: true, inStock: true, accessDays: "365", publish: false };
  const parsed = productFormSchema.parse(form);
  assert.deepEqual([parsed.title, parsed.price, parsed.discountedPrice, parsed.accessDays], ["Nefes", 950.5, null, 365]);
  assert.deepEqual(productFormSchema.parse(parsed), parsed, "the server re-parses what the form submits");
  assert.equal(productFormSchema.safeParse({ ...form, discountedPrice: "950.5" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...form, price: "9.999" }).success, false);
  assert.deepEqual(productChangeSchema.parse({ discountedPrice: null }), { discountedPrice: null });
  assert.deepEqual(productChangeSchema.parse({ price: 1200, listed: false }), { price: 1200, listed: false });
  assert.equal(productChangeSchema.safeParse({ price: 100, discountedPrice: 100 }).success, false);
});

test("publishing through Akademi makes the hidden product visible via Shopier before publishing locally", async () => {
  const hidden = product({ id: "70000003", title: "Hidden demo", customListing: true });
  await applyShopierProduct(db, hidden);
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.shopierProductId, hidden.id));
  const status = async () => (await db.select().from(schema.courses).where(eq(schema.courses.id, course.id)))[0].status;
  const { shopier, calls } = fakeShopier(hidden);
  const { createAkademi } = await import("../lib/akademi/akademi.ts");
  await createAkademi({ db, shopier }).owner.setCourseStatus("owner", course.id, "published");
  assert.deepEqual(calls.filter(call => call.method === "PUT").map(call => [call.path, call.body]), [["/products/70000003", { customListing: false }]]);
  assert.equal(await status(), "published");
  await setCourseStatus(db, "owner", course.id, "draft", shopier);
  assert.deepEqual(calls.at(-1).body, { customListing: true });
  const ignored = { updateProduct: async () => hidden };
  await assert.rejects(() => setCourseStatus(db, "owner", course.id, "published", ignored), /görünürlüğünü/);
  assert.equal(await status(), "draft");
  const failing = { updateProduct: async () => { throw new ShopierError(403, "forbidden"); } };
  await assert.rejects(() => setCourseStatus(db, "owner", course.id, "published", failing), ShopierError);
  assert.equal(await status(), "draft");
  await setCourseStatus(db, "owner", course.id, "published", shopier);
  await assert.rejects(() => updateCourseProduct(db, "owner", course.id, { hidden: true }, shopier), /taslağa/);
  const beforeRetry = calls.length;
  await setCourseStatus(db, "owner", course.id, "published", shopier);
  assert.equal(calls.length, beforeRetry + 1, "republishing repairs visibility even if the local status is already published");
  await setCourseStatus(db, "owner", course.id, "archived", shopier);
  assert.deepEqual(calls.at(-1).body, { customListing: true });
});

test("creating a published course overrides a hidden listing choice", async () => {
  const { shopier, calls } = fakeShopier(product({ id: "70000004", title: "Published demo" }));
  await createCourse(db, "owner", { title: "Published demo", description: "", priceKurus: 100, imageUrl: "https://files.example/demo.jpg", hidden: true, accessDurationDays: 365, status: "published" }, shopier);
  assert.equal(calls.find(call => call.method === "POST").body.customListing, false);
});
