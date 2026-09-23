import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { getAuth } from "./index";
import { authDestination } from "./navigation";
import { isOwner } from "./owner-access";

type Session = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>>;

/** A verified student; `owner` is true for accounts in the protected owners table. */
export type Viewer = Session & { owner: boolean };

/** The one session read for a request. Every page, Server Function and route handler authorizes from this. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Read the request first so pages stay per-request even while authentication is switched off.
  const requestHeaders = await headers();
  if (!config().enabled.auth) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user.emailVerified) return null;
  return { ...session, owner: await isOwner(getDatabase(), session.user.id) };
});

// Page adapters: redirect or 404.

export async function studentPage(destination = "/akademi/hesabim") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/akademi/giris?next=${encodeURIComponent(authDestination(destination))}`);
  return viewer;
}

export async function ownerPage() {
  const viewer = await studentPage("/yonetim");
  if (!viewer.owner) notFound();
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
  if (!viewer.owner) throw new Error("FORBIDDEN");
  return viewer;
}

export const privateNoStore = { "Cache-Control": "private, no-store" };

// Route handler adapter: a private 403 for non-owners, otherwise null.
export async function ownerRouteDenied() {
  const viewer = await getViewer();
  return viewer?.owner ? null : Response.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403, headers: privateNoStore });
}
