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
