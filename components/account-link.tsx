"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

/** Signed-in student chip; the session is read client-side (httpOnly cookie) so pages stay static. */
export function AccountLink({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = authClient.useSession();
  if (!data?.user.emailVerified) return null;
  const firstName = data.user.name.trim().split(/\s+/)[0] || "Hesabım";
  return <Link href="/akademi/hesabim" className="inline-flex items-center gap-2 font-medium transition-colors duration-200" onClick={onNavigate} aria-label={`Hesabım — ${data.user.name}`}>
    <span className="grid size-[30px] place-items-center rounded-full bg-sage text-[14px] text-forest" aria-hidden="true">{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</span>
    <span>{firstName}</span>
  </Link>;
}
