import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { owners } from "@/lib/db/schema";
import { authDestination } from "./navigation";

export async function studentPageSession(destination = "/akademi/hesabim") {
  const login = `/akademi/giris?next=${encodeURIComponent(authDestination(destination))}`;
  if (!isAuthConfigured()) redirect(login);
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect(login);
  return session;
}

/** Identity-only guard for MFA enrollment. It does NOT authorize owner operations. */
export async function ownerEnrollmentSession() {
  const session = await studentPageSession("/yonetim/guvenlik");
  const [owner] = await getDatabase().select({ userId: owners.userId }).from(owners).where(eq(owners.userId, session.user.id)).limit(1);
  if (!owner) notFound();
  return session;
}
