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

const authRoutes = ["giris", "kayit", "sifremi-unuttum", "sifre-yenile", "dogrulama"];
for (const route of authRoutes) {
  const response = await fetch(new URL(`/akademi/${route}`, origin));
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.match(html, /<h1[ >]/, `${route} should have a heading`);
  assert.match(html, /name="robots" content="noindex, nofollow"/, `${route} must not be indexed`);
}
for (const route of ["/akademi/hesabim", "/yonetim", "/yonetim/guvenlik", "/yonetim/egitimler"]) {
  const response = await fetch(new URL(route, origin), { redirect: "manual" });
  assert.equal(response.status, 307, `${route} requires a session`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.origin + location.pathname, new URL("/akademi/giris", origin).href, `${route} redirects to login`);
  assert.ok(location.searchParams.get("next"), `${route} returns after login`);
}
for (const method of ["GET", "POST"]) {
  const response = await fetch(new URL("/api/internal/email-delivery", origin), { method });
  assert.equal(response.status, 401, `${method} email worker requires authorization`);
  const sync = await fetch(new URL("/api/internal/shopier-sync", origin), { method });
  assert.equal(sync.status, 401, `${method} Shopier sync requires authorization`);
}
const unsigned = await fetch(new URL("/api/shopier/webhook", origin), { method: "POST", headers: { "shopier-event": "order.created" }, body: "{}" });
assert.ok([401, 503].includes(unsigned.status), "unsigned Shopier webhooks are rejected");
console.log("Five auth screens are noindex; account/owner routes redirect anonymous users; email and Shopier workers require authorization; unsigned webhooks are rejected.");
