import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { getAuth } from "./index";
import { authDestination } from "./navigation";
import { ownerStatus } from "./owner-access";

type Session = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>>;

/** A verified student; `owner` is set for Nilgün's account, and `mfaVerified` only once this session passed MFA. */
export type Viewer = Session & { owner: { mfaVerified: boolean } | null };

/** The one session read for a request. Every page, Server Function and route handler authorizes from this. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Read the request first so pages stay per-request even while authentication is switched off.
  const requestHeaders = await headers();
  if (!config().enabled.auth) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user.emailVerified) return null;
  const { isOwner, sessionMfaVerified } = await ownerStatus(getDatabase(), session.user.id, session.session.id);
  return { ...session, owner: isOwner ? { mfaVerified: session.user.twoFactorEnabled === true && sessionMfaVerified } : null };
});

// Page adapters: redirect or 404.

export async function studentPage(destination = "/akademi/hesabim") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/akademi/giris?next=${encodeURIComponent(authDestination(destination))}`);
  return viewer;
}

/** Identity-only guard for MFA enrollment. It does NOT authorize owner operations. */
export async function ownerEnrollmentPage() {
  const viewer = await studentPage("/yonetim/guvenlik");
  if (!viewer.owner) notFound();
  return viewer;
}

export async function ownerPage() {
  const viewer = await ownerEnrollmentPage();
  if (!viewer.owner?.mfaVerified) redirect("/yonetim/guvenlik");
  return viewer;
}

// Server Function adapters: throw. Call in every action as well as its page; never trust a client role.

export async function requireStudent() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("UNAUTHORIZED");
  return viewer;
}

export async function requireOwner() {
  const viewer = await requireStudent();
  if (!viewer.owner?.mfaVerified) throw new Error("FORBIDDEN");
  return viewer;
}
