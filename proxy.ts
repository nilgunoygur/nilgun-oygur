import { NextResponse, type NextRequest } from "next/server";
import { authDestination } from "@/lib/auth/navigation";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check only: sends visitors without a session cookie to the login page before rendering.
// Real authorization (verified session, owner row) happens in lib/auth/viewer.ts on every request.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const next = pathname.startsWith("/yonetim/guvenlik") ? "/yonetim/guvenlik" : pathname.startsWith("/yonetim") ? "/yonetim" : authDestination(pathname);
  return NextResponse.redirect(new URL(`/akademi/giris?next=${encodeURIComponent(next)}`, request.url));
}

export const config = { matcher: ["/akademi/hesabim/:path*", "/yonetim/:path*"] };
