import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { syncRecentShopierOrders } from "@/lib/akademi/server";

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
    const result = await syncRecentShopierOrders();
    if (result.courses.updated > 0) revalidatePath("/akademi", "layout");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Shopier sync is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

// Vercel Cron invokes GET with the same bearer secret; this is the safety net for missed webhooks.
export const GET = POST;
