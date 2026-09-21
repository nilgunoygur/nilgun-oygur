import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { providerEvents } from "../db/schema.ts";
import { isValidWebhookSignature, shopierOrderSchema } from "../shopier/api.ts";
import { recordShopierOrder } from "./purchases.ts";
import type { Database } from "../db/types.ts";

type WebhookResult = { status: 200 | 401 | 500; outcome: string };

/** Verifies and applies one order.created webhook; stores only the payload hash. A 500 makes Shopier retry. */
export async function handleShopierWebhook(db: Database, rawBody: string, headers: Headers, token: string): Promise<WebhookResult> {
  if (!isValidWebhookSignature(rawBody, headers.get("shopier-signature"), token)) return { status: 401, outcome: "invalid_signature" };
  if (headers.get("shopier-event") !== "order.created") return { status: 200, outcome: "ignored_event" };
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const eventIdentity = `order.created:${headers.get("shopier-webhook-id") ?? payloadHash}`;
  await db.insert(providerEvents).values({ provider: "shopier", eventIdentity, verifiedPayloadHash: payloadHash }).onConflictDoNothing();
  const [event] = await db.select().from(providerEvents).where(and(eq(providerEvents.provider, "shopier"), eq(providerEvents.eventIdentity, eventIdentity)));
  if (event.verifiedPayloadHash !== payloadHash) return { status: 200, outcome: "conflicting_duplicate" };
  if (event.status === "processed") return { status: 200, outcome: "duplicate" };
  try {
    const result = await recordShopierOrder(db, shopierOrderSchema.parse(JSON.parse(rawBody)));
    await db.update(providerEvents).set({ status: "processed", processedAt: new Date(), attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: result.reason ?? null })
      .where(eq(providerEvents.id, event.id));
    return { status: 200, outcome: result.reason ?? "recorded" };
  } catch (error) {
    const detail = error instanceof Error ? error.name + ": " + error.message.slice(0, 200) : "Unknown error";
    await db.update(providerEvents).set({ status: "failed", attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: detail })
      .where(eq(providerEvents.id, event.id));
    return { status: 500, outcome: "failed" };
  }
}
