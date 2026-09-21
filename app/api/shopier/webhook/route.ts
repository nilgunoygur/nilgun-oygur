import { getDatabase } from "@/lib/db";
import { handleShopierWebhook } from "@/lib/akademi/shopier-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

// Shopier expects 200 within five seconds; any other status is retried for up to 72 hours.
export async function POST(request: Request) {
  const token = process.env.SHOPIER_WEBHOOK_TOKEN;
  if (!token || !process.env.DATABASE_URL) return new Response(null, { status: 503, headers: noStore });
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return new Response(null, { status: 413, headers: noStore });
  const { status, outcome } = await handleShopierWebhook(getDatabase(), rawBody, request.headers, token);
  return Response.json({ outcome }, { status, headers: noStore });
}
