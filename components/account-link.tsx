"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

/** Signed-in student chip; the session is read client-side (httpOnly cookie) so pages stay static. */
export function AccountLink({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = authClient.useSession();
  if (!data?.user.emailVerified) return null;
  const firstName = data.user.name.trim().split(/\s+/)[0] || "Hesabım";
  return <Link href="/akademi/hesabim" className="account-link" onClick={onNavigate} aria-label={`Hesabım — ${data.user.name}`}>
    <span className="account-link-avatar" aria-hidden="true">{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</span>
    <span>{firstName}</span>
  </Link>;
}
