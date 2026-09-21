// Subscribes order.created to <base-url>/api/shopier/webhook; prints only the one-time token to stdout.
// Usage: pnpm run shopier:webhook https://example.com
import nextEnv from "@next/env";
import { createShopierClient } from "../lib/shopier/api.ts";

nextEnv.loadEnvConfig(process.cwd());
const base = process.argv[2];
if (!base?.startsWith("https://")) throw new Error("Pass the public https base URL.");
const url = new URL("/api/shopier/webhook", base).href;
const shopier = createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");
const existing = (await shopier.listWebhooks()).find(hook => hook.event === "order.created" && hook.url === url);
if (existing) {
  console.error(`order.created is already subscribed to ${url} (id ${existing.id}). Its token cannot be shown again; delete it in Shopier to rotate.`);
  process.exit(1);
}
const hook = await shopier.createWebhook("order.created", url);
console.error(`Subscribed order.created → ${url} (id ${hook.id}).`);
process.stdout.write(hook.token);
