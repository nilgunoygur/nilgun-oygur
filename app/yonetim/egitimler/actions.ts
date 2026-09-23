"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { getShopier } from "@/lib/shopier";

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

const priceSchema = z.object({ courseId: z.uuid(), price: z.coerce.number().min(1).max(10_000_000) });

export async function updateCoursePrice(formData: FormData) {
  await requireOwner();
  const { courseId, price } = priceSchema.parse({ courseId: formData.get("courseId"), price: formData.get("price") });
  const [course] = await getDatabase().select({ productId: courses.shopierProductId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new Error("Eğitim bulunamadı.");
  const shopier = getShopier();
  const product = await shopier.getProduct(course.productId);
  if (!product || product.type !== "digital" || product.priceData.currency !== "TRY") throw new Error("Shopier ürünü güncellenemiyor.");
  if (product.priceData.discount) throw new Error("İndirimli fiyatı Shopier mağazasında düzenleyin.");
  await shopier.updateProductPrice(course.productId, Math.round(price * 100));
  catalogChangedByOwner();
  refresh();
}
