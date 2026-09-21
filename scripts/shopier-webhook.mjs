// Subscribes order.created, product.created and product.updated to <base-url>/api/shopier/webhook.
// Prints only the comma-separated one-time tokens to stdout. Usage: pnpm run --silent shopier:webhook https://example.com
import nextEnv from "@next/env";
import { createShopierClient } from "../lib/shopier/api.ts";

nextEnv.loadEnvConfig(process.cwd());
const base = process.argv[2];
if (!base?.startsWith("https://")) throw new Error("Pass the public https base URL.");
const url = new URL("/api/shopier/webhook", base).href;
const shopier = createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");
const existing = await shopier.listWebhooks();
const tokens = [];
for (const event of ["order.created", "product.created", "product.updated"]) {
  if (existing.some(hook => hook.event === event && hook.url === url)) {
    console.error(`${event} is already subscribed to ${url}; delete it in Shopier to rotate its token.`);
    process.exit(1);
  }
  const hook = await shopier.createWebhook(event, url);
  console.error(`Subscribed ${event} → ${url} (id ${hook.id}).`);
  tokens.push(hook.token);
}
process.stdout.write(tokens.join(","));
