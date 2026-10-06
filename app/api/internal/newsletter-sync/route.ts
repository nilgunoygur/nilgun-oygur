import { isCronRequest } from "@/lib/cron-auth";
import { syncSubscribersToResend } from "@/lib/newsletter-resend";

const noStore = { "Cache-Control": "no-store" };

// Daily, after the Shopier sync: a subscriber who registered or bought since gets the new kind in Resend.
export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401, headers: noStore });
  try {
    return Response.json(await syncSubscribersToResend(), { headers: noStore });
  } catch {
    return Response.json({ error: "Newsletter sync is unavailable." }, { status: 503, headers: noStore });
  }
}

// Vercel Cron invokes GET with the same bearer secret.
export const GET = POST;
