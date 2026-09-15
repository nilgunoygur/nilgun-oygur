import { timingSafeEqual } from "node:crypto";
import { deliverPendingEmails } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(authorization) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    return Response.json(await deliverPendingEmails(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Email delivery is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

// Vercel Cron invokes GET with the same bearer secret as the manual POST worker.
export const GET = POST;
