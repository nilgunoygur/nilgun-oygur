import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { deleteStoredFiles } from "@/lib/files/storage";

export async function POST() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  try {
    const { files, deleted } = await akademi().owner.syncCatalog(viewer.user.id);
    await deleteStoredFiles(files);
    return Response.json({ deleted: deleted.length }, { headers: privateNoStore });
  } catch {
    return Response.json({ error: "Shopier eşitlemesi başarısız oldu." }, { status: 500, headers: privateNoStore });
  } finally {
    // A failed sync may already have archived or deleted courses.
    catalogChangedByOwner();
  }
}
