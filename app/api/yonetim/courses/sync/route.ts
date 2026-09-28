import { getViewer, ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";

export async function POST() {
  const denied = await ownerRouteDenied();
  if (denied) return denied;
  try {
    await akademi().owner.syncCatalog((await getViewer())!.user.id);
    catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch {
    return Response.json({ error: "Shopier eşitlemesi başarısız oldu." }, { status: 500, headers: privateNoStore });
  }
}
