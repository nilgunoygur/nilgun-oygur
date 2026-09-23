import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

export async function GET() {
  const denied = await ownerRouteDenied();
  if (denied) return denied;
  const { courses } = await akademi().owner.catalog();
  return Response.json({ courses }, { headers: privateNoStore });
}
