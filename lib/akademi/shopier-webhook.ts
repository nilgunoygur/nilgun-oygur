import { isValidWebhookSignature, shopierOrderSchema, shopierProductSchema } from "../shopier/api.ts";
import { recordShopierOrder } from "./course-access.ts";
import { applyShopierProduct, type CatalogOptions } from "./catalog.ts";
import { receive } from "./provider-inbox.ts";
import type { Database } from "../db/types.ts";

// Shopier adapter for the Provider Inbox: verifies the signature, maps events to Course Access and Catalog.

export type WebhookResult = { status: 200 | 401 | 500; outcome: string; catalogChanged: boolean };
type Handled = { outcome: string; catalogChanged: boolean };

const handlers: Record<string, (db: Database, payload: unknown, options: CatalogOptions) => Promise<Handled>> = {
  "order.created": async (db, payload) => ({ outcome: (await recordShopierOrder(db, shopierOrderSchema.parse(payload))).reason ?? "recorded", catalogChanged: false }),
  "product.created": async (db, payload, options) => catalogResult(await applyShopierProduct(db, shopierProductSchema.parse(payload), options)),
  "product.updated": async (db, payload, options) => catalogResult(await applyShopierProduct(db, shopierProductSchema.parse(payload), options)),
};
const catalogResult = (outcome: "added" | "changed" | "ignored"): Handled => ({ outcome, catalogChanged: outcome !== "ignored" });

/** Each subscription has its own token. A 500 makes Shopier retry (up to nine times over 72 hours). */
export async function handleShopierWebhook(db: Database, rawBody: string, headers: Headers, tokens: string[], options: CatalogOptions): Promise<WebhookResult> {
  if (!tokens.some(token => isValidWebhookSignature(rawBody, headers.get("shopier-signature"), token))) return { status: 401, outcome: "invalid_signature", catalogChanged: false };
  const name = headers.get("shopier-event") ?? "";
  const handle = handlers[name];
  if (!handle) return { status: 200, outcome: "ignored_event", catalogChanged: false };
  const received = await receive(db, { provider: "shopier", name, deliveryId: headers.get("shopier-webhook-id"), rawBody }, () => handle(db, JSON.parse(rawBody), options));
  switch (received.status) {
    case "processed": return { status: 200, ...received.result };
    case "retry": return { status: 500, outcome: "failed", catalogChanged: false };
    case "in_progress": return { status: 500, outcome: "in_progress", catalogChanged: false };
    default: return { status: 200, outcome: received.status, catalogChanged: false };
  }
}
