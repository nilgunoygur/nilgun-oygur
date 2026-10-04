import { isShopierId, isValidWebhookSignature, shopierOrderSchema, shopierProductSchema, shopierRefundSchema } from "../shopier/api.ts";
import { recordShopierRefund } from "./refunds.ts";
import { recordShopierOrder } from "./course-access.ts";
import { applyShopierProduct } from "./catalog.ts";
import { receive } from "./provider-inbox.ts";
import type { Database } from "../db/types.ts";

// Shopier adapter for the Provider Inbox: verifies the signature, maps events to Course Access and Catalog.

export type WebhookResult = { status: 200 | 401 | 500; outcome: string; catalogChanged: boolean };
type Handled = { outcome: string; catalogChanged: boolean };

const handlers: Record<string, (db: Database, payload: unknown) => Promise<Handled>> = {
  "order.created": async (db, payload) => ({ outcome: (await recordShopierOrder(db, shopierOrderSchema.parse(payload))).reason ?? "recorded", catalogChanged: false }),
  "refund.updated": async (db, payload) => ({ outcome: await recordShopierRefund(db, shopierRefundSchema.parse(payload)), catalogChanged: false }),
  "product.created": async (db, payload) => catalogResult(await applyShopierProduct(db, shopierProductSchema.parse(payload))),
  "product.updated": async (db, payload) => catalogResult(await applyShopierProduct(db, shopierProductSchema.parse(payload))),
};
const catalogResult = (outcome: "added" | "changed" | "ignored"): Handled => ({ outcome, catalogChanged: outcome !== "ignored" });

/** Each subscription has its own token. A 500 makes Shopier retry (up to nine times over 72 hours). */
export async function handleShopierWebhook(db: Database, rawBody: string, headers: Headers, tokens: string[]): Promise<WebhookResult> {
  if (!tokens.some(token => isValidWebhookSignature(rawBody, headers.get("shopier-signature"), token))) return { status: 401, outcome: "invalid_signature", catalogChanged: false };
  const name = headers.get("shopier-event") ?? "";
  const handle = handlers[name];
  if (!handle) return { status: 200, outcome: "ignored_event", catalogChanged: false };
  let resourceId: string | undefined;
  try {
    const id = JSON.parse(rawBody)?.id;
    if ((typeof id === "string" || typeof id === "number") && isShopierId(String(id))) resourceId = String(id);
  } catch { /* Invalid payloads are recorded as failed by the inbox below. */ }
  const received = await receive(db, { provider: "shopier", name, deliveryId: headers.get("shopier-webhook-id"), resourceId, rawBody }, () => handle(db, JSON.parse(rawBody)));
  switch (received.status) {
    case "processed": return { status: 200, ...received.result };
    case "retry": return { status: 500, outcome: "failed", catalogChanged: false };
    case "in_progress": return { status: 500, outcome: "in_progress", catalogChanged: false };
    default: return { status: 200, outcome: received.status, catalogChanged: false };
  }
}
