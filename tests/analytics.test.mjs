import { test } from "node:test";
import assert from "node:assert/strict";
import { analyticsLocation, contentGroup, isTrackedPath } from "../lib/analytics.ts";
import { parseConfig } from "../lib/config.ts";

test("GA sees the path and campaign parameters, never tokens or return URLs", () => {
  assert.equal(analyticsLocation("https://nilgunoygur.com/akademi/sifre-yenile?token=secret-reset-token"), "https://nilgunoygur.com/akademi/sifre-yenile");
  assert.equal(analyticsLocation("https://nilgunoygur.com/akademi/giris?next=%2Fyonetim&verified=1"), "https://nilgunoygur.com/akademi/giris");
  assert.equal(analyticsLocation("https://nilgunoygur.com/blog/yazi?utm_source=instagram&email=a%40b.com&utm_campaign=eylul#bolum"), "https://nilgunoygur.com/blog/yazi?utm_source=instagram&utm_campaign=eylul");
});

test("owner pages are never tracked; content groups split blog, academy and the rest", () => {
  assert.deepEqual(["/yonetim", "/yonetim/kullanicilar", "/yonetimxyz", "/blog"].map(isTrackedPath), [false, false, true, true]);
  assert.deepEqual(["/blog", "/blog/nefes", "/akademi/kurs", "/egitimlerim/bioenerji-egitimi", "/kitaplarim", "/"].map(contentGroup), ["Blog", "Blog", "Akademi", "Akademi", "Kitaplar", "Site"]);
});

test("analytics runs in production by default and elsewhere only when configured", () => {
  assert.equal(parseConfig({ VERCEL_ENV: "production" }).analyticsId, "G-YQGTYEX7ZH");
  assert.equal(parseConfig({ VERCEL_ENV: "preview" }).analyticsId, undefined);
  assert.equal(parseConfig({}).analyticsId, undefined);
  assert.equal(parseConfig({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST123" }).analyticsId, "G-TEST123");
});
