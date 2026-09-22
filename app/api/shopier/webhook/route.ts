import { revalidatePath, revalidateTag } from "next/cache";
import { PRODUCTS_TAG } from "@/lib/shopier/api";
import { getDatabase } from "@/lib/db";
import { handleShopierWebhook } from "@/lib/akademi/shopier-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

// Shopier retries non-200 responses for up to 72 hours.
export async function POST(request: Request) {
  const tokens = (process.env.SHOPIER_WEBHOOK_TOKEN ?? "").split(",").map(token => token.trim()).filter(Boolean);
  if (tokens.length === 0 || !process.env.DATABASE_URL) return new Response(null, { status: 503, headers: noStore });
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return new Response(null, { status: 413, headers: noStore });
  const { status, outcome } = await handleShopierWebhook(getDatabase(), rawBody, request.headers, tokens);
  if (outcome === "added" || outcome === "changed") {
    revalidateTag(PRODUCTS_TAG, "max");
    revalidatePath("/akademi", "layout");
  }
  return Response.json({ outcome }, { status, headers: noStore });
}
