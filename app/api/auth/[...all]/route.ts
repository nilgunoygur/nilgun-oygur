import { after } from "next/server";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { deliverPendingEmails } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthConfigured()) return Response.json({ error: "Akademi hesap işlemleri henüz kullanıma açılmadı." }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const response = await getAuth().handler(request);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  if (request.method === "POST" && /\/(sign-up\/email|request-password-reset|send-verification-email)$/.test(new URL(request.url).pathname)) {
    after(async () => {
      try { await deliverPendingEmails(); } catch { console.error("Akademi email delivery could not run; queued messages require retry."); }
    });
  }
  return response;
}
export const GET = handle;
export const POST = handle;
