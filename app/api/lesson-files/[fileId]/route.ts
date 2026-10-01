import { eq } from "drizzle-orm";
import { z } from "zod";
import { getViewer, privateNoStore } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { lessonFiles } from "@/lib/db/schema";
import { accessibleFile } from "@/lib/akademi/learning";
import { filesConfigured, signedFileUrl } from "@/lib/files/storage";

const empty = (status: number) => new Response(null, { status, headers: privateNoStore });

// Access is rechecked on every request; the owner may open any file.
export async function GET(_: Request, { params }: RouteContext<"/api/lesson-files/[fileId]">) {
  const viewer = await getViewer();
  if (!viewer) return empty(401);
  const id = z.uuid().safeParse((await params).fileId);
  if (!id.success || !filesConfigured()) return empty(404);
  const db = getDatabase();
  const file = viewer.owner ? (await db.select().from(lessonFiles).where(eq(lessonFiles.id, id.data)))[0] : await accessibleFile(db, viewer.user.id, id.data);
  if (!file) return empty(404);
  try {
    return new Response(null, { status: 302, headers: { ...privateNoStore, Location: await signedFileUrl(file.pathname, Date.now() + 600_000) } });
  } catch { return empty(502); }
}
