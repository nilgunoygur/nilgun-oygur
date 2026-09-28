"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { courseAccessSchema, coursePriceSchema } from "@/lib/akademi/owner-forms";

const statusSchema = z.object({ courseId: z.uuid(), status: z.enum(["draft", "published", "archived"]) });

export async function setCourseStatus(input: z.input<typeof statusSchema>) {
  const viewer = await requireOwner();
  const { courseId, status } = statusSchema.parse(input);
  if (await akademi().owner.setCourseStatus(viewer.user.id, courseId, status)) catalogChangedByOwner();
  refresh();
}

const accessSchema = courseAccessSchema.extend({ courseId: z.uuid() });

export async function setAccessDuration(input: z.input<typeof accessSchema>) {
  const viewer = await requireOwner();
  const { courseId, value } = accessSchema.parse(input);
  if (await akademi().owner.setAccessDuration(viewer.user.id, courseId, value)) catalogChangedByOwner();
  refresh();
}

export async function syncCatalogNow() {
  const viewer = await requireOwner();
  await akademi().owner.syncCatalog(viewer.user.id);
  catalogChangedByOwner();
  refresh();
}

const priceSchema = coursePriceSchema.extend({ courseId: z.uuid() });

export async function updateCoursePrice(input: z.input<typeof priceSchema>) {
  const viewer = await requireOwner();
  const { courseId, value } = priceSchema.parse(input);
  await akademi().owner.updateCoursePrice(viewer.user.id, courseId, Math.round(value * 100));
  catalogChangedByOwner();
  refresh();
}
