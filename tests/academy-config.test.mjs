import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../lib/config.ts";

test("features switch on only when every value they need is present", () => {
  const none = parseConfig({});
  assert.deepEqual(none.enabled, { catalog: false, webhooks: false, email: false, auth: false });
  assert.equal(none.siteUrl, "http://localhost:3000");
  const base = { DATABASE_URL: "postgres://x", BETTER_AUTH_URL: "https://a.example", BETTER_AUTH_SECRET: "s", EMAIL_ENCRYPTION_KEY: "k" };
  assert.equal(parseConfig(base).enabled.auth, false, "deployments need Resend");
  assert.equal(parseConfig({ ...base, NODE_ENV: "development" }).enabled.auth, true, "local dev prints emails instead");
  assert.equal(parseConfig({ ...base, RESEND_API_KEY: "r", RESEND_FROM: "f" }).enabled.auth, false, "Reply-To is required");
  assert.equal(parseConfig({ ...base, RESEND_API_KEY: "r", RESEND_FROM: "f", RESEND_REPLY_TO: "t" }).enabled.auth, true);
  const shop = parseConfig({ DATABASE_URL: "postgres://x", SHOPIER_API_TOKEN: "t", SHOPIER_WEBHOOK_TOKEN: " a, ,b ", SHOPIER_SHOW_HIDDEN_PRODUCTS: "true" });
  assert.deepEqual([shop.enabled.catalog, shop.enabled.webhooks, shop.shopier.webhookTokens, shop.shopier.includeHidden], [true, true, ["a", "b"], true]);
  assert.equal(parseConfig({ SHOPIER_API_TOKEN: "  " }).shopier.token, undefined, "blank values count as missing");
});
