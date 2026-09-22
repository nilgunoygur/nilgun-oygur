import { revalidatePath, revalidateTag } from "next/cache";
import { PRODUCTS_TAG } from "@/lib/shopier/api";
import { syncRecentShopierOrders } from "@/lib/akademi/server";
import { isCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await syncRecentShopierOrders();
    revalidateTag(PRODUCTS_TAG, "max");
    revalidatePath("/akademi", "layout");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Shopier sync is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = POST;
