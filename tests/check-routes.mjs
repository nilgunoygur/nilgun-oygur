import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const pages = JSON.parse(
  await readFile(new URL("../lib/reference.json", import.meta.url), "utf8"),
);
const origin = process.env.TEST_ORIGIN || "http://localhost:3001";
for (const path of Object.keys(pages)) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /<h1[ >]/, `${path} should have a page heading`);
}
assert.equal(
  (await fetch(new URL("/this-page-does-not-exist", origin))).status,
  404,
);
console.log(
  `All ${Object.keys(pages).length} content routes return 200 and include a heading. Unknown route returns 404.`,
);

const noindexRoutes = ["giris", "kayit", "sifremi-unuttum", "sifre-yenile", "dogrulama", "satin-alim-sonrasi", "egitim-ekleme"];
for (const route of noindexRoutes) {
  const response = await fetch(new URL(`/akademi/${route}`, origin));
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.match(html, /<h1[ >]/, `${route} should have a heading`);
  assert.match(html, /name="robots" content="noindex, nofollow"/, `${route} must not be indexed`);
}
for (const route of ["/akademi/hesabim", "/akademi/siparis-ekle", "/yonetim", "/yonetim/guvenlik", "/yonetim/egitimler", "/yonetim/kullanicilar", "/yonetim/aboneler", "/yonetim/iadeler"]) {
  const response = await fetch(new URL(route, origin), { redirect: "manual" });
  assert.equal(response.status, 307, `${route} requires a session`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.origin + location.pathname, new URL("/akademi/giris", origin).href, `${route} redirects to login`);
  assert.ok(location.searchParams.get("next"), `${route} returns after login`);
  if (route === "/akademi/siparis-ekle") assert.equal(location.searchParams.get("next"), route, "claim form destination survives anonymous redirect");
}
for (const method of ["GET", "POST"]) {
  const response = await fetch(new URL("/api/internal/email-delivery", origin), { method });
  assert.equal(response.status, 401, `${method} email worker requires authorization`);
  const sync = await fetch(new URL("/api/internal/shopier-sync", origin), { method });
  assert.equal(sync.status, 401, `${method} Shopier sync requires authorization`);
}
const unsigned = await fetch(new URL("/api/shopier/webhook", origin), { method: "POST", headers: { "shopier-event": "order.created" }, body: "{}" });
assert.ok([401, 503].includes(unsigned.status), "unsigned Shopier webhooks are rejected");
const anyId = "00000000-0000-4000-8000-000000000000";
assert.equal((await fetch(new URL(`/api/lesson-files/${anyId}`, origin), { redirect: "manual" })).status, 401, "lesson files require a session");
const product = () => { const body = new FormData(); body.set("data", "{}"); return body; };
for (const [method, path] of [["GET", "/api/yonetim/refund-requests"], ["GET", "/api/yonetim/courses"], ["POST", "/api/yonetim/courses"], ["PUT", `/api/yonetim/courses/${anyId}/product`], ["POST", `/api/yonetim/refund-requests/${anyId}`]]) {
  const response = await fetch(new URL(path, origin), { method, body: method === "GET" ? undefined : product() });
  assert.equal(response.status, 403, `${method} ${path} requires the owner`);
}
console.log("Lesson files require a session; creating and editing Shopier products and deciding refund requests require the owner.");
console.log("Auth and guide screens are noindex; account/owner routes redirect anonymous users; email and Shopier workers require authorization; unsigned webhooks are rejected.");
