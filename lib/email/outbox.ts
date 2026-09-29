import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { emailDeliveries } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

/** Encrypted at rest and erased after delivery or expiry. */
/** `replacesUnsent` cancels unsent mail with the same recipient and subject. */
export type EmailMessage = { to: string; subject: string; text: string; html?: string; replyTo?: string; expiresAt?: Date; replacesUnsent?: boolean };
export type DeliverEmail = (message: Omit<EmailMessage, "expiresAt" | "replacesUnsent">, key: string) => Promise<string>;
/** Thrown for outages and throttling: the rest of the batch waits for the next run. */
export class ProviderUnavailableError extends Error {}
// Retries must stay inside Resend's 24-hour idempotency window.
const maxLifetime = 23 * 3_600_000;

export function createEmailOutbox(db: Database, encryptionKey: string) {
  if (encryptionKey.length < 32) throw new Error("EMAIL_ENCRYPTION_KEY must contain at least 32 characters.");
  return {
    async enqueue(message: EmailMessage) {
      const { expiresAt, replacesUnsent, ...content } = message;
      const payload = JSON.stringify(content);
      if (replacesUnsent) {
        const unsent = or(eq(emailDeliveries.status, "pending"), eq(emailDeliveries.status, "failed"));
        for (const row of await db.select().from(emailDeliveries).where(and(unsent, isNotNull(emailDeliveries.encryptedMessage)))) {
          const queued: typeof content = JSON.parse(await symmetricDecrypt({ key: encryptionKey, data: row.encryptedMessage! }));
          if (queued.to === content.to && queued.subject === content.subject) {
            await db.update(emailDeliveries).set({ status: "expired", encryptedMessage: null }).where(and(eq(emailDeliveries.id, row.id), unsent));
          }
        }
      }
      const deduplicationKey = createHash("sha256").update(payload).digest("hex");
      await db.insert(emailDeliveries).values({
        deduplicationKey,
        encryptedMessage: await symmetricEncrypt({ key: encryptionKey, data: payload }),
        expiresAt: new Date(Math.min(expiresAt?.getTime() ?? Infinity, Date.now() + maxLifetime)),
      }).onConflictDoNothing({ target: emailDeliveries.deduplicationKey });
    },
    async deliverBatch(deliver: DeliverEmail, limit = 10) {
      const now = new Date();
      await db.update(emailDeliveries).set({ status: "expired", encryptedMessage: null })
        .where(and(lte(emailDeliveries.expiresAt, now), or(eq(emailDeliveries.status, "pending"), eq(emailDeliveries.status, "failed"), and(eq(emailDeliveries.status, "sending"), lte(emailDeliveries.leaseExpiresAt, now)))));
      const candidates = await db.select({ id: emailDeliveries.id }).from(emailDeliveries)
        .where(and(gt(emailDeliveries.expiresAt, now), lte(emailDeliveries.availableAt, now), lt(emailDeliveries.attemptCount, 5), or(
          eq(emailDeliveries.status, "pending"), eq(emailDeliveries.status, "failed"),
          and(eq(emailDeliveries.status, "sending"), lte(emailDeliveries.leaseExpiresAt, now)),
        ))).orderBy(emailDeliveries.createdAt).limit(Math.min(Math.max(limit, 1), 20));
      let sent = 0;
      for (const candidate of candidates) {
        const leaseId = randomUUID();
        // Compare-and-set claims prevent concurrent invocations from sending the same row.
        const [claimed] = await db.update(emailDeliveries).set({
          status: "sending", leaseId, leaseExpiresAt: new Date(Date.now() + 120_000),
          attemptCount: sql`${emailDeliveries.attemptCount} + 1`,
        }).where(and(eq(emailDeliveries.id, candidate.id), lte(emailDeliveries.availableAt, new Date()), lt(emailDeliveries.attemptCount, 5), gt(emailDeliveries.expiresAt, new Date()), isNotNull(emailDeliveries.encryptedMessage), or(
          eq(emailDeliveries.status, "pending"), eq(emailDeliveries.status, "failed"),
          and(eq(emailDeliveries.status, "sending"), lte(emailDeliveries.leaseExpiresAt, new Date())),
        ))).returning();
        if (!claimed?.encryptedMessage) continue;
        try {
          const message = JSON.parse(await symmetricDecrypt({ key: encryptionKey, data: claimed.encryptedMessage }));
          // The same key survives worker crashes and retries (provider deduplication).
          const providerMessageId = await deliver(message, claimed.id);
          await db.update(emailDeliveries).set({ status: "sent", providerMessageId, encryptedMessage: null, lastError: null, leaseId: null, leaseExpiresAt: null })
            .where(and(eq(emailDeliveries.id, claimed.id), eq(emailDeliveries.leaseId, leaseId)));
          sent++;
        } catch (error) {
          // Provider exceptions may contain recipient addresses or reset URLs: do not persist them.
          await db.update(emailDeliveries).set({ status: "failed", lastError: "delivery_failed", leaseId: null, leaseExpiresAt: null, availableAt: new Date(Date.now() + Math.min(2 ** claimed.attemptCount * 60_000, 900_000)) })
            .where(and(eq(emailDeliveries.id, claimed.id), eq(emailDeliveries.leaseId, leaseId)));
          if (error instanceof ProviderUnavailableError) break;
        }
      }
      return { sent };
    },
  };
}
