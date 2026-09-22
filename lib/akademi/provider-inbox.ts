import { and, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { providerEvents } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

// Provider Inbox: applies each verified provider event once. Only a payload hash is stored, never the payload
// (it holds buyer PII). A failed event returns `retry`, so the provider redelivers it; reconciliation jobs
// (the daily Shopier order replay) recover anything a provider gives up on. Each provider adapter verifies
// its own signature before calling `receive`.

export type VerifiedEvent = { provider: string; name: string; deliveryId: string | null; rawBody: string };
export type InboxResult<T> =
  | { status: "processed"; result: T }
  | { status: "duplicate" | "conflicting_duplicate" }
  | { status: "retry" };

export async function receive<T>(db: Database, event: VerifiedEvent, handle: () => Promise<T>): Promise<InboxResult<T>> {
  const payloadHash = createHash("sha256").update(event.rawBody).digest("hex");
  const eventIdentity = `${event.name}:${event.deliveryId ?? payloadHash}`;
  await db.insert(providerEvents).values({ provider: event.provider, eventIdentity, verifiedPayloadHash: payloadHash }).onConflictDoNothing();
  const [stored] = await db.select().from(providerEvents).where(and(eq(providerEvents.provider, event.provider), eq(providerEvents.eventIdentity, eventIdentity)));
  if (stored.verifiedPayloadHash !== payloadHash) return { status: "conflicting_duplicate" };
  if (stored.status === "processed") return { status: "duplicate" };
  try {
    const result = await handle();
    await db.update(providerEvents).set({ status: "processed", processedAt: new Date(), attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: null })
      .where(eq(providerEvents.id, stored.id));
    return { status: "processed", result };
  } catch (error) {
    // Error names and messages only: parse errors never echo field values, but trim anyway.
    const detail = error instanceof Error ? error.name + ": " + error.message.slice(0, 200) : "Unknown error";
    await db.update(providerEvents).set({ status: "failed", attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: detail })
      .where(eq(providerEvents.id, stored.id));
    return { status: "retry" };
  }
}

/** Events that failed and have not been processed since, for the owner's "needs attention" list. */
export function failedEvents(db: Database, limit = 20) {
  return db.select({ provider: providerEvents.provider, eventIdentity: providerEvents.eventIdentity, attempts: providerEvents.attemptCount, error: providerEvents.errorDetails, at: providerEvents.updatedAt })
    .from(providerEvents).where(eq(providerEvents.status, "failed")).orderBy(providerEvents.updatedAt).limit(limit);
}
