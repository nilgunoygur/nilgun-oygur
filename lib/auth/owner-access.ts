import { eq } from "drizzle-orm";
import { owners, session } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

/** Owner rights come only from the protected owners table. */
export async function isOwner(db: Database, userId: string) {
  const [owner] = await db.select({ userId: owners.userId }).from(owners).where(eq(owners.userId, userId)).limit(1);
  return !!owner;
}

export async function revokeUserSessions(db: Database, userId: string) {
  await db.delete(session).where(eq(session.userId, userId));
}
