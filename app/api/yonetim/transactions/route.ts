import { dashboardRange, recentShopierTransactions } from "@/lib/akademi/dashboard";
import { requireOwner } from "@/lib/auth/viewer";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try { await requireOwner(); }
  catch { return new Response(null, { status: 403, headers: privateNoStore }); }

  const params = new URL(request.url).searchParams;
  const range = dashboardRange({ period: "custom", from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  return Response.json(await recentShopierTransactions(range), { headers: privateNoStore });
}
