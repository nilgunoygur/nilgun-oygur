"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

/**
 * Shows the signed-in student in the site header. The session is read through Better Auth's
 * get-session endpoint with the httpOnly cookie, so pages stay static and no token reaches JS.
 * Renders nothing while loading, when signed out, or when authentication is not configured.
 */
export function AccountLink({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = authClient.useSession();
  if (!data?.user.emailVerified) return null;
  const firstName = data.user.name.trim().split(/\s+/)[0] || "Hesabım";
  return <Link href="/akademi/hesabim" className="account-link" onClick={onNavigate} aria-label={`Hesabım — ${data.user.name}`}>
    <span className="account-link-avatar" aria-hidden="true">{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</span>
    <span>{firstName}</span>
  </Link>;
}
