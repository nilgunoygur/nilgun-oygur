import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { providerEvents } from "../db/schema.ts";
import { isValidWebhookSignature, shopierOrderSchema, shopierProductSchema } from "../shopier/api.ts";
import { recordShopierOrder } from "./purchases.ts";
import { applyShopierProduct } from "./course-sync.ts";
import type { Database } from "../db/types.ts";

type WebhookResult = { status: 200 | 401 | 500; outcome: string };

const handlers: Record<string, (db: Database, payload: unknown) => Promise<string>> = {
  "order.created": async (db, payload) => (await recordShopierOrder(db, shopierOrderSchema.parse(payload))).reason ?? "recorded",
  "product.created": (db, payload) => applyShopierProduct(db, shopierProductSchema.parse(payload)),
  "product.updated": (db, payload) => applyShopierProduct(db, shopierProductSchema.parse(payload)),
};

/** Verifies (each subscription has its own token) and applies one webhook once; stores only the payload hash. A 500 makes Shopier retry. */
export async function handleShopierWebhook(db: Database, rawBody: string, headers: Headers, tokens: string[]): Promise<WebhookResult> {
  if (!tokens.some(token => isValidWebhookSignature(rawBody, headers.get("shopier-signature"), token))) return { status: 401, outcome: "invalid_signature" };
  const eventName = headers.get("shopier-event") ?? "";
  const handle = handlers[eventName];
  if (!handle) return { status: 200, outcome: "ignored_event" };
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const eventIdentity = `${eventName}:${headers.get("shopier-webhook-id") ?? payloadHash}`;
  await db.insert(providerEvents).values({ provider: "shopier", eventIdentity, verifiedPayloadHash: payloadHash }).onConflictDoNothing();
  const [event] = await db.select().from(providerEvents).where(and(eq(providerEvents.provider, "shopier"), eq(providerEvents.eventIdentity, eventIdentity)));
  if (event.verifiedPayloadHash !== payloadHash) return { status: 200, outcome: "conflicting_duplicate" };
  if (event.status === "processed") return { status: 200, outcome: "duplicate" };
  try {
    const outcome = await handle(db, JSON.parse(rawBody));
    await db.update(providerEvents).set({ status: "processed", processedAt: new Date(), attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: null })
      .where(eq(providerEvents.id, event.id));
    return { status: 200, outcome };
  } catch (error) {
    const detail = error instanceof Error ? error.name + ": " + error.message.slice(0, 200) : "Unknown error";
    await db.update(providerEvents).set({ status: "failed", attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: detail })
      .where(eq(providerEvents.id, event.id));
    return { status: 500, outcome: "failed" };
  }
}
