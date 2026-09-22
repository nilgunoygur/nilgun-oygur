"use server";
import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, courses } from "@/lib/db/schema";
import { PRODUCTS_TAG } from "@/lib/shopier/api";
import { syncCatalog } from "@/lib/akademi/server";

const statusSchema = z.object({ courseId: z.uuid(), status: z.enum(["draft", "published", "archived"]) });

export async function setCourseStatus(formData: FormData) {
  const session = await requireOwner();
  const { courseId, status } = statusSchema.parse({ courseId: formData.get("courseId"), status: formData.get("status") });
  const db = getDatabase();
  const [course] = await db.update(courses).set({ status }).where(eq(courses.id, courseId)).returning({ id: courses.id });
  if (!course) return;
  await db.insert(adminAuditLog).values({ actorId: session.user.id, action: `course.${status}`, resourceType: "course", resourceId: courseId, reason: "Durum değiştirildi" });
  revalidatePath("/yonetim/egitimler");
  revalidatePath("/akademi", "layout");
}

const accessSchema = z.object({ courseId: z.uuid(), accessDays: z.coerce.number().int().min(1).max(3650) });

/** Access duration is the one course setting that lives on the site rather than in Shopier. */
export async function setAccessDuration(formData: FormData) {
  const session = await requireOwner();
  const { courseId, accessDays } = accessSchema.parse({ courseId: formData.get("courseId"), accessDays: formData.get("accessDays") });
  await getDatabase().update(courses).set({ accessDurationDays: accessDays }).where(eq(courses.id, courseId));
  await getDatabase().insert(adminAuditLog).values({ actorId: session.user.id, action: "course.access_duration", resourceType: "course", resourceId: courseId, reason: `${accessDays} gün` });
  revalidatePath("/yonetim/egitimler");
  revalidatePath("/akademi", "layout");
}

export async function syncCatalogNow() {
  const session = await requireOwner();
  await syncCatalog();
  updateTag(PRODUCTS_TAG);
  await getDatabase().insert(adminAuditLog).values({ actorId: session.user.id, action: "catalog.sync", resourceType: "catalog", resourceId: "shopier", reason: "Shopier ile eşitlendi" });
  revalidatePath("/yonetim/egitimler");
  revalidatePath("/akademi", "layout");
}
