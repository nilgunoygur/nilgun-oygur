import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { emailDeliveries } from "../db/schema.ts";
import type { AuthEmail } from "../auth/create-auth.ts";
import type { Database } from "../db/types.ts";

export type DeliverEmail = (message: Pick<AuthEmail, "to" | "subject" | "text">, key: string) => Promise<string>;

export function createEmailOutbox(db: Database, encryptionKey: string) {
  if (encryptionKey.length < 32) throw new Error("EMAIL_ENCRYPTION_KEY must contain at least 32 characters.");
  return {
    async enqueue(message: AuthEmail) {
      const payload = JSON.stringify({ to: message.to, subject: message.subject, text: message.text });
      const deduplicationKey = createHash("sha256").update(payload).digest("hex");
      await db.insert(emailDeliveries).values({
        deduplicationKey,
        encryptedMessage: await symmetricEncrypt({ key: encryptionKey, data: payload }),
        expiresAt: message.expiresAt,
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
        } catch {
          // Provider exceptions may contain recipient addresses or reset URLs: do not persist them.
          await db.update(emailDeliveries).set({ status: "failed", lastError: "delivery_failed", leaseId: null, leaseExpiresAt: null, availableAt: new Date(Date.now() + Math.min(2 ** claimed.attemptCount * 60_000, 900_000)) })
            .where(and(eq(emailDeliveries.id, claimed.id), eq(emailDeliveries.leaseId, leaseId)));
        }
      }
      return { sent };
    },
  };
}
