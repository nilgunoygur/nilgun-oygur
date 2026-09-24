import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

export async function GET() {
  const denied = await ownerRouteDenied();
  if (denied) return denied;
  const owner = akademi().owner;
  const [{ courses, recentSales }, attention] = await Promise.all([owner.catalog(), owner.needsAttention()]);
  return Response.json({
    courses,
    recentSales: recentSales.map(sale => ({ ...sale, claimed: Boolean(sale.claimed), at: sale.at.toISOString() })),
    attention: attention.map(item => ({ ...item, at: item.at.toISOString() })),
  }, { headers: privateNoStore });
}
