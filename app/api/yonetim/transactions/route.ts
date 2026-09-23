import { dashboardRange, recentShopierTransactions } from "@/lib/akademi/dashboard";
import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";

export async function GET(request: Request) {
  const denied = await ownerRouteDenied();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const range = dashboardRange({ period: "custom", from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  return Response.json(await recentShopierTransactions(range), { headers: privateNoStore });
}
