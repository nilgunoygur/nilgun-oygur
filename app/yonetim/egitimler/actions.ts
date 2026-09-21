"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, courses } from "@/lib/db/schema";
import { parseShopierProduct } from "@/lib/shopier/api";
import { fetchShopierProduct } from "@/lib/shopier/public-product";
import { courseFieldsFromProduct } from "@/lib/akademi/course-sync";
import { courseSlug } from "@/lib/akademi/slug";
import { syncCatalog } from "@/lib/akademi/server";
import type { FormState } from "@/components/akademi/form-status";

const linkSchema = z.object({
  shopierLink: z.string().trim().min(1, "Shopier ürün linkini yapıştırın.").max(300),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir."),
  accessDays: z.coerce.number().int("Erişim süresi tam gün olmalı.").min(1).max(3650),
});

/** Links a product the store page cannot list (e.g. hidden in Shopier) as a draft course. */
export async function linkCourse(_: FormState, formData: FormData): Promise<FormState> {
  let session;
  try { session = await requireOwner(); } catch { return { status: "error", message: "Bu işlem için yönetici doğrulaması gerekli." }; }
  const parsed = linkSchema.safeParse({ shopierLink: formData.get("shopierLink") ?? "", slug: formData.get("slug") ?? "", accessDays: formData.get("accessDays") ?? "365" });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const product = parseShopierProduct(parsed.data.shopierLink);
  if (!product) return { status: "error", message: "Shopier ürün linki tanınmadı. Örnek: https://www.shopier.com/51075042" };
  const lookup = await fetchShopierProduct(product.id);
  if (lookup.status !== "found") return { status: "error", message: "Shopier ürün sayfası okunamadı. Linki kontrol edin." };
  if (lookup.product.currency !== "TRY") return { status: "error", message: "Akademi yalnızca TL fiyatlı Shopier ürünlerini destekler." };
  try {
    const [course] = await getDatabase().insert(courses).values({
      ...courseFieldsFromProduct(lookup.product, null),
      slug: parsed.data.slug || courseSlug(lookup.product.title) || `egitim-${product.id}`,
      accessDurationDays: parsed.data.accessDays, shopierProductId: product.id, shopierUrl: product.url, status: "draft",
    }).returning({ id: courses.id });
    await getDatabase().insert(adminAuditLog).values({ actorId: session.user.id, action: "course.link", resourceType: "course", resourceId: course.id, reason: `Shopier ürünü ${product.id}` });
  } catch {
    return { status: "error", message: "Eğitim kaydedilemedi. Adres veya Shopier ürünü zaten kullanılıyor olabilir." };
  }
  revalidatePath("/yonetim/egitimler");
  return { status: "success", message: "Eğitim taslak olarak eklendi. Yayınladığınızda Akademi’de görünür." };
}

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
  await getDatabase().insert(adminAuditLog).values({ actorId: session.user.id, action: "catalog.sync", resourceType: "catalog", resourceId: "shopier", reason: "Shopier ile eşitlendi" });
  revalidatePath("/yonetim/egitimler");
  revalidatePath("/akademi", "layout");
}
