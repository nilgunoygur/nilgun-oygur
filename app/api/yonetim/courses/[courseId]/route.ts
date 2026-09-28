import { z } from "zod";
import { getViewer, ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { courseChangeSchema } from "@/lib/akademi/owner-forms";

export async function PATCH(request: Request, { params }: RouteContext<"/api/yonetim/courses/[courseId]">) {
  const denied = await ownerRouteDenied();
  if (denied) return denied;
  const actorId = (await getViewer())!.user.id;
  const courseId = z.uuid().safeParse((await params).courseId);
  const change = courseChangeSchema.safeParse(await request.json().catch(() => null));
  if (!courseId.success || !change.success) return Response.json({ error: change.error?.issues[0]?.message ?? "Geçersiz istek." }, { status: 400, headers: privateNoStore });

  const owner = akademi().owner;
  const edit = change.data;
  try {
    let changed = true;
    if (edit.kind === "status") changed = await owner.setCourseStatus(actorId, courseId.data, edit.status);
    else if (edit.kind === "access") changed = await owner.setAccessDuration(actorId, courseId.data, edit.value);
    else await owner.updateCoursePrice(actorId, courseId.data, Math.round(edit.value * 100));
    if (changed) catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch {
    return Response.json({ error: "Değişiklik kaydedilemedi." }, { status: 500, headers: privateNoStore });
  }
}
