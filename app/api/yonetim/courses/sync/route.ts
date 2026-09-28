import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";

export async function POST() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  try {
    await akademi().owner.syncCatalog(viewer.user.id);
    catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch {
    return Response.json({ error: "Shopier eşitlemesi başarısız oldu." }, { status: 500, headers: privateNoStore });
  }
}
