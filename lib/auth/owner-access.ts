import { eq } from "drizzle-orm";
import { ownerMfaSessions, owners, session } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

/** Owner rights come from the protected owners table plus a server-written MFA proof for this exact session. */
export async function ownerStatus(db: Database, userId: string, sessionId: string) {
  const [[owner], [proof]] = await Promise.all([
    db.select({ userId: owners.userId }).from(owners).where(eq(owners.userId, userId)).limit(1),
    db.select({ sessionId: ownerMfaSessions.sessionId }).from(ownerMfaSessions).where(eq(ownerMfaSessions.sessionId, sessionId)).limit(1),
  ]);
  return { isOwner: !!owner, sessionMfaVerified: !!proof };
}

/** Written only after a successful TOTP or backup-code verification. */
export async function markMfaSession(db: Database, sessionId: string) {
  await db.insert(ownerMfaSessions).values({ sessionId }).onConflictDoNothing();
}

export async function revokeUserSessions(db: Database, userId: string) {
  await db.delete(session).where(eq(session.userId, userId));
}
