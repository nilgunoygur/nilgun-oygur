import { eq } from "drizzle-orm";
import { z } from "zod";
import { getViewer, privateNoStore } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { lessonFiles } from "@/lib/db/schema";
import { accessibleFile } from "@/lib/akademi/learning";
import { filesConfigured, signedFileUrl } from "@/lib/files/storage";

const refuse = (status: number) => new Response(null, { status, headers: privateNoStore });

// Recordings and homework PDFs: checks the student's access on every request, then redirects to a
// short-lived signed link. The owner may open any file to preview it.
export async function GET(_: Request, { params }: RouteContext<"/api/lesson-files/[fileId]">) {
  const viewer = await getViewer();
  if (!viewer) return refuse(401);
  const id = z.uuid().safeParse((await params).fileId);
  if (!id.success || !filesConfigured()) return refuse(404);
  const db = getDatabase(), now = Date.now();
  let file: typeof lessonFiles.$inferSelect | undefined, accessUntil = now + 3600_000;
  if (viewer.owner) [file] = await db.select().from(lessonFiles).where(eq(lessonFiles.id, id.data));
  else {
    const access = await accessibleFile(db, viewer.user.id, id.data);
    file = access?.file;
    if (access) accessUntil = access.grant.expiresAt.getTime();
  }
  if (!file) return refuse(404);
  // A recording plays for a long time and seeks with new requests; a PDF only needs to open.
  const validUntil = Math.min(now + (file.kind === "audio" ? 6 * 3600_000 : 600_000), accessUntil);
  try {
    return new Response(null, { status: 302, headers: { ...privateNoStore, Location: await signedFileUrl(file.pathname, validUntil) } });
  } catch { return refuse(502); }
}
