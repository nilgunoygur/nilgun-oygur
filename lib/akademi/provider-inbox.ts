import { and, eq, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { providerEvents } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

// Provider Inbox stores only a payload hash because webhook bodies contain buyer PII.
// A short lease prevents concurrent deliveries from applying the same event twice,
// while allowing a later delivery to reclaim work after a crashed handler.

export type VerifiedEvent = { provider: string; name: string; deliveryId: string | null; rawBody: string };
export type InboxResult<T> =
  | { status: "processed"; result: T }
  | { status: "duplicate" | "conflicting_duplicate" | "in_progress" }
  | { status: "retry" };

const LEASE_MS = 2 * 60 * 1000;

export async function receive<T>(db: Database, event: VerifiedEvent, handle: () => Promise<T>): Promise<InboxResult<T>> {
  const payloadHash = createHash("sha256").update(event.rawBody).digest("hex");
  const eventIdentity = `${event.name}:${event.deliveryId ?? payloadHash}`;
  const leaseId = randomUUID();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_MS);

  const claim = await db.transaction(async (tx) => {
    await tx.insert(providerEvents).values({ provider: event.provider, eventIdentity, verifiedPayloadHash: payloadHash }).onConflictDoNothing();
    const [stored] = await tx.select().from(providerEvents)
      .where(and(eq(providerEvents.provider, event.provider), eq(providerEvents.eventIdentity, eventIdentity)))
      .for("update");
    if (stored.verifiedPayloadHash !== payloadHash) return { status: "conflicting_duplicate" as const };
    if (stored.status === "processed") return { status: "duplicate" as const };
    if (stored.status === "processing" && stored.leaseExpiresAt && stored.leaseExpiresAt > now) return { status: "in_progress" as const };

    await tx.update(providerEvents).set({
      status: "processing", leaseId, leaseExpiresAt, attemptCount: sql`${providerEvents.attemptCount} + 1`, errorDetails: null,
    }).where(eq(providerEvents.id, stored.id));
    return { status: "claimed" as const };
  });

  if (claim.status !== "claimed") return claim;
  try {
    const result = await handle();
    const updated = await db.update(providerEvents).set({
      status: "processed", processedAt: new Date(), leaseId: null, leaseExpiresAt: null, errorDetails: null,
    }).where(and(eq(providerEvents.provider, event.provider), eq(providerEvents.eventIdentity, eventIdentity), eq(providerEvents.status, "processing"), eq(providerEvents.leaseId, leaseId))).returning({ id: providerEvents.id });
    return updated.length ? { status: "processed", result } : { status: "retry" };
  } catch (error) {
    // Error messages are truncated; payload values themselves are never saved.
    const detail = error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : "Unknown error";
    await db.update(providerEvents).set({ status: "failed", leaseId: null, leaseExpiresAt: null, errorDetails: detail })
      .where(and(eq(providerEvents.provider, event.provider), eq(providerEvents.eventIdentity, eventIdentity), eq(providerEvents.status, "processing"), eq(providerEvents.leaseId, leaseId)));
    return { status: "retry" };
  }
}

/** Events that failed and have not been processed since, for the owner's "needs attention" list. */
export function failedEvents(db: Database, limit = 20) {
  return db.select({ provider: providerEvents.provider, eventIdentity: providerEvents.eventIdentity, attempts: providerEvents.attemptCount, error: providerEvents.errorDetails, at: providerEvents.updatedAt })
    .from(providerEvents).where(eq(providerEvents.status, "failed")).orderBy(providerEvents.updatedAt).limit(limit);
}
