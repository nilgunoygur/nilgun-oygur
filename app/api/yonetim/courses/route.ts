import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";

export async function GET() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  return Response.json(await akademi().owner.catalogSnapshot(), { headers: privateNoStore });
}
