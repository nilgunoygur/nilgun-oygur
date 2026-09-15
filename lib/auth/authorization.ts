import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "./index";
import { getDatabase } from "@/lib/db";
import { owners, ownerMfaSessions } from "@/lib/db/schema";
import { hasOwnerAuthorization } from "./owner-policy";

export async function requireStudent() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) throw new Error("UNAUTHORIZED");
  return session;
}

/** Call in every owner action/handler as well as its page. Never trust a client role. */
export async function requireOwner() {
  const session = await requireStudent();
  const db = getDatabase();
  const [owner] = await db.select().from(owners).where(eq(owners.userId, session.user.id)).limit(1);
  const [proof] = await db.select().from(ownerMfaSessions).where(eq(ownerMfaSessions.sessionId, session.session.id)).limit(1);
  if (!hasOwnerAuthorization({ hasSession: true, emailVerified: session.user.emailVerified, isOwner: !!owner, twoFactorEnabled: session.user.twoFactorEnabled === true, sessionMfaVerified: !!proof })) throw new Error("FORBIDDEN");
  return session;
}
