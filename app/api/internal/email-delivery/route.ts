import { deliverPendingEmails } from "@/lib/email";
import { isCronRequest } from "@/lib/cron-auth";

export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json(await deliverPendingEmails(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Email delivery is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

// Vercel Cron invokes GET with the same bearer secret as the manual POST worker.
export const GET = POST;
