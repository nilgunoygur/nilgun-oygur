import { akademi, catalogChangedByProvider } from "@/lib/akademi/server";
import { isCronRequest } from "@/lib/cron-auth";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401, headers: noStore });
  try {
    const result = await akademi().access.replayRecentOrders();
    catalogChangedByProvider();
    return Response.json(result, { headers: noStore });
  } catch {
    return Response.json({ error: "Shopier sync is unavailable." }, { status: 503, headers: noStore });
  }
}

// Vercel Cron invokes GET with the same bearer secret.
export const GET = POST;
