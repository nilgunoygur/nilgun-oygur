import { akademi } from "@/lib/akademi/server";
import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";

export async function GET(request: Request) {
  const denied = await ownerRouteDenied();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const transactions = await akademi().owner.overview.transactions({ period: "custom", from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  return Response.json(transactions, { headers: privateNoStore });
}
