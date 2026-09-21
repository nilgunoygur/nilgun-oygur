"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, courses } from "@/lib/db/schema";
import { getShopier, isShopierConfigured } from "@/lib/shopier";
import { parsePriceKurus, parseShopierProduct } from "@/lib/shopier/api";
import { fetchShopierProduct, isShopierImageUrl } from "@/lib/shopier/public-product";
import { courseFieldsFromProduct } from "@/lib/akademi/course-sync";
import { defaultCourseCover } from "@/lib/akademi/catalog";
import { courseSlug } from "@/lib/akademi/slug";
import { refreshCourseFromShopier } from "@/lib/akademi/server";
import type { FormState } from "@/components/akademi/form-status";

const courseSchema = z.object({
  title: z.string().trim().max(120),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir."),
  description: z.string().trim().max(5000),
  price: z.string().trim().refine(v => v === "" || (parsePriceKurus(v) ?? 0) > 0, "Fiyatı TL olarak yazın, örneğin 2490 veya 2490,50."),
  accessDays: z.coerce.number().int("Erişim süresi tam gün olmalı.").min(1).max(3650),
  cover: z.string().trim().max(500).refine(v => v === "" || /^\/images\/[\w./-]+\.(png|jpe?g)$/i.test(v) || isShopierImageUrl(v), "Görsel, sitedeki /images/… yolu veya Shopier görsel adresi olmalı."),
  shopierLink: z.string().trim().max(300),
  hidden: z.boolean(),
});
type CourseInput = z.output<typeof courseSchema>;
type Resolved = { error: string } | { product: { id: string; url: string }; fields: ReturnType<typeof courseFieldsFromProduct> };

/** Existing product: Shopier is the source of truth for its details. */
async function linkExistingProduct(link: string, cover: string): Promise<Resolved> {
  const product = parseShopierProduct(link);
  if (!product) return { error: "Shopier ürün linki tanınmadı. Örnek: https://www.shopier.com/51075042" };
  const details = await fetchShopierProduct(product.id).catch(() => null);
  if (!details) return { error: "Shopier ürün sayfası okunamadı. Linki ve ürünün yayında olduğunu kontrol edin." };
  if (details.currency !== "TRY") return { error: "Akademi yalnızca TL fiyatlı Shopier ürünlerini destekler." };
  return { product, fields: courseFieldsFromProduct(details, cover) };
}

async function createShopierProduct(input: CourseInput, cover: string): Promise<Resolved> {
  const priceKurus = parsePriceKurus(input.price) ?? 0;
  if (input.title.length < 3 || priceKurus <= 0) return { error: "Yeni Shopier ürünü için eğitim adı ve fiyat gerekli." };
  if (!isShopierConfigured()) return { error: "Shopier bağlantısı yapılandırılmamış. Ürün linkini yapıştırın." };
  const imageUrl = cover.startsWith("https://") ? cover : (process.env.NEXT_PUBLIC_SITE_URL ?? "") + cover;
  if (!/^https:\/\/(?!localhost)/.test(imageUrl)) return { error: "Shopier görseli okuyabilmek için sitenin herkese açık adresi gerekli. Ürünü Shopier’de oluşturup linkini yapıştırın." };
  const fields = { title: input.title, description: input.description, cover, priceKurus, compareAtPriceKurus: null };
  try {
    return { product: await getShopier().createProduct({ ...fields, description: fields.description || fields.title, imageUrl, hidden: input.hidden }), fields };
  } catch {
    return { error: "Shopier ürünü oluşturulamadı. Lütfen daha sonra yeniden deneyin." };
  }
}

export async function createCourse(_: FormState, formData: FormData): Promise<FormState> {
  let session;
  try { session = await requireOwner(); } catch { return { status: "error", message: "Bu işlem için yönetici doğrulaması gerekli." }; }
  const parsed = courseSchema.safeParse({
    title: formData.get("title") ?? "", slug: formData.get("slug") ?? "", description: formData.get("description") ?? "",
    price: formData.get("price") ?? "", accessDays: formData.get("accessDays") ?? "365", cover: formData.get("cover") ?? "",
    shopierLink: formData.get("shopierLink") ?? "", hidden: formData.get("hidden") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;
  const cover = input.cover || defaultCourseCover;
  const slug = input.slug || courseSlug(input.title);
  const db = getDatabase();
  if (slug && (await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1)).length) return { status: "error", message: "Bu adresle bir eğitim zaten var." };

  const resolved = input.shopierLink ? await linkExistingProduct(input.shopierLink, cover) : await createShopierProduct(input, cover);
  if ("error" in resolved) return { status: "error", message: resolved.error };
  const { product, fields } = resolved;
  try {
    const [course] = await db.insert(courses).values({
      ...fields, slug: slug || courseSlug(fields.title),
      accessDurationDays: input.accessDays, shopierProductId: product.id, shopierUrl: product.url, status: "draft",
    }).returning({ id: courses.id });
    await db.insert(adminAuditLog).values({ actorId: session.user.id, action: "course.create", resourceType: "course", resourceId: course.id, reason: `Shopier ürünü ${product.id}` });
  } catch {
    return { status: "error", message: "Eğitim kaydedilemedi. Adres veya Shopier ürünü başka bir eğitimde kullanılıyor olabilir." };
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

export async function refreshCourse(formData: FormData) {
  const session = await requireOwner();
  const courseId = z.uuid().parse(formData.get("courseId"));
  const outcome = await refreshCourseFromShopier(courseId);
  if (outcome === "updated") {
    await getDatabase().insert(adminAuditLog).values({ actorId: session.user.id, action: "course.shopier_sync", resourceType: "course", resourceId: courseId, reason: "Shopier ürün bilgileri güncellendi" });
    revalidatePath("/akademi", "layout");
  }
  revalidatePath("/yonetim/egitimler");
}
