import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

export async function GET() {
  const denied = await ownerRouteDenied();
  if (denied) return denied;
  return Response.json(await akademi().owner.catalogSnapshot(), { headers: privateNoStore });
}
