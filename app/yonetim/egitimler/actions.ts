"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";

const statusSchema = z.object({ courseId: z.uuid(), status: z.enum(["draft", "published", "archived"]) });

export async function setCourseStatus(formData: FormData) {
  const viewer = await requireOwner();
  const { courseId, status } = statusSchema.parse({ courseId: formData.get("courseId"), status: formData.get("status") });
  if (await akademi().owner.setCourseStatus(viewer.user.id, courseId, status)) catalogChangedByOwner();
  refresh();
}

const accessSchema = z.object({ courseId: z.uuid(), accessDays: z.coerce.number().int().min(1).max(3650) });

export async function setAccessDuration(formData: FormData) {
  const viewer = await requireOwner();
  const { courseId, accessDays } = accessSchema.parse({ courseId: formData.get("courseId"), accessDays: formData.get("accessDays") });
  if (await akademi().owner.setAccessDuration(viewer.user.id, courseId, accessDays)) catalogChangedByOwner();
  refresh();
}

export async function syncCatalogNow() {
  const viewer = await requireOwner();
  await akademi().owner.syncCatalog(viewer.user.id);
  catalogChangedByOwner();
  refresh();
}
