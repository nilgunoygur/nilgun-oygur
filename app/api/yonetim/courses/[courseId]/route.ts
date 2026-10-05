import { z } from "zod";
import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { productFailure, refuse } from "@/lib/akademi/product-request";
import { courseChangeSchema } from "@/lib/akademi/owner-forms";

export async function PATCH(request: Request, { params }: RouteContext<"/api/yonetim/courses/[courseId]">) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const actorId = viewer.user.id;
  const courseId = z.uuid().safeParse((await params).courseId);
  const change = courseChangeSchema.safeParse(await request.json().catch(() => null));
  if (!courseId.success || !change.success) return refuse(change.error?.issues[0]?.message ?? "Geçersiz istek.");

  const { owner } = akademi(), edit = change.data;
  try {
    if (edit.kind === "status") await owner.setCourseStatus(actorId, courseId.data, edit.status);
    else if (await owner.setAccessDuration(actorId, courseId.data, edit.value)) catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch (error) {
    return edit.kind === "status" ? productFailure(error) : refuse("Değişiklik kaydedilemedi.", 500);
  } finally {
    // A status change can reach Shopier before a later step fails.
    if (edit.kind === "status") catalogChangedByOwner();
  }
}
