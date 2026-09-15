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
for (const route of ["/akademi/hesabim", "/yonetim", "/yonetim/guvenlik"]) {
  const response = await fetch(new URL(route, origin), { redirect: "manual" });
  assert.equal(response.status, 307, `${route} requires a session`);
  assert.match(response.headers.get("location"), /^\/akademi\/giris\?next=/);
}
for (const method of ["GET", "POST"]) {
  const response = await fetch(new URL("/api/internal/email-delivery", origin), { method });
  assert.equal(response.status, 401, `${method} email worker requires authorization`);
}
console.log("Five auth screens are noindex; account/owner routes redirect anonymous users; both email worker methods require authorization.");
