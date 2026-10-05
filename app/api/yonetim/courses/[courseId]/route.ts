import { z } from "zod";
import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { productFailure } from "@/lib/akademi/product-request";
import { courseChangeSchema } from "@/lib/akademi/owner-forms";

export async function PATCH(request: Request, { params }: RouteContext<"/api/yonetim/courses/[courseId]">) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const actorId = viewer.user.id;
  const courseId = z.uuid().safeParse((await params).courseId);
  const change = courseChangeSchema.safeParse(await request.json().catch(() => null));
  if (!courseId.success || !change.success) return Response.json({ error: change.error?.issues[0]?.message ?? "Geçersiz istek." }, { status: 400, headers: privateNoStore });

  const { owner } = akademi(), edit = change.data;
  try {
    let changed: boolean;
    if (edit.kind === "status") changed = await owner.setCourseStatus(actorId, courseId.data, edit.status);
    else changed = await owner.setAccessDuration(actorId, courseId.data, edit.value);
    if (changed) catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch (error) {
    return productFailure(error);
  }
}
