// Subscribes order.created, product.created and product.updated and refund.updated to <base-url>/api/shopier/webhook.
// Prints only the comma-separated one-time tokens to stdout; capture them before saving (see docs/akademi/IMPLEMENTATION.md).
// Usage: pnpm run --silent shopier:webhook https://example.com
import nextEnv from "@next/env";
import { createShopierClient } from "../lib/shopier/api.ts";

nextEnv.loadEnvConfig(process.cwd());
const base = process.argv[2];
if (!base?.startsWith("https://")) throw new Error("Pass the public https base URL.");
const url = new URL("/api/shopier/webhook", base).href;
const shopier = createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");
const existing = await shopier.listWebhooks();
const tokens = (process.env.SHOPIER_WEBHOOK_TOKEN ?? "").split(",").map(token => token.trim()).filter(Boolean);
const events = ["order.created", "product.created", "product.updated", "refund.updated"];
const subscribed = events.filter(event => existing.some(hook => hook.event === event && hook.url === url));
if (subscribed.length && !tokens.length) throw new Error("Existing subscriptions need their signing tokens in SHOPIER_WEBHOOK_TOKEN before adding another subscription.");
for (const event of events) {
  if (existing.some(hook => hook.event === event && hook.url === url)) {
    console.error(`${event} is already subscribed to ${url}; keeping it.`);
    continue;
  }
  const hook = await shopier.createWebhook(event, url);
  console.error(`Subscribed ${event} → ${url} (id ${hook.id}).`);
  tokens.push(hook.token);
}
process.stdout.write(tokens.join(","));
