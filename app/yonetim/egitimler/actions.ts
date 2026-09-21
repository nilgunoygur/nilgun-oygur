"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, courses } from "@/lib/db/schema";
import { getShopier, isShopierConfigured } from "@/lib/shopier";
import { parseShopierProduct } from "@/lib/shopier/api";
import { courseSlug } from "@/lib/akademi/slug";

export type CourseFormState = { status: "idle" | "success" | "error"; message: string };


const courseSchema = z.object({
  title: z.string().trim().min(3, "Eğitim adı en az 3 karakter olmalı.").max(120),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir."),
  description: z.string().trim().max(5000),
  price: z.string().trim().regex(/^\d{1,7}([.,]\d{1,2})?$/, "Fiyatı TL olarak yazın, örneğin 2490 veya 2490,50."),
  accessDays: z.coerce.number().int("Erişim süresi tam gün olmalı.").min(1).max(3650),
  cover: z.string().trim().max(500).refine(v => v === "" || /^\/images\/[\w./-]+\.(png|jpe?g)$/i.test(v) || /^https:\/\/cdn\.shopier\.app\/[\w./-]+\.(png|jpe?g)$/i.test(v), "Görsel, sitedeki /images/… yolu veya Shopier görsel adresi olmalı."),
  shopierLink: z.string().trim().max(300),
  hidden: z.boolean(),
});

export async function createCourse(_: CourseFormState, formData: FormData): Promise<CourseFormState> {
  let session;
  try { session = await requireOwner(); } catch { return { status: "error", message: "Bu işlem için yönetici doğrulaması gerekli." }; }
  const parsed = courseSchema.safeParse({
    title: formData.get("title") ?? "", slug: formData.get("slug") ?? "", description: formData.get("description") ?? "",
    price: formData.get("price") ?? "", accessDays: formData.get("accessDays") ?? "365", cover: formData.get("cover") ?? "",
    shopierLink: formData.get("shopierLink") ?? "", hidden: formData.get("hidden") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;
  const slug = input.slug || courseSlug(input.title);
  if (!slug) return { status: "error", message: "Eğitim için geçerli bir adres oluşturulamadı." };
  const priceKurus = Math.round(Number(input.price.replace(",", ".")) * 100);
  if (priceKurus <= 0) return { status: "error", message: "Fiyat sıfırdan büyük olmalı." };
  const cover = input.cover || "/images/akademi/academy-art-v1.png";
  const db = getDatabase();
  if ((await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1)).length) return { status: "error", message: "Bu adresle bir eğitim zaten var." };

  let product = input.shopierLink ? parseShopierProduct(input.shopierLink) : null;
  if (input.shopierLink && !product) return { status: "error", message: "Shopier ürün linki tanınmadı. Örnek: https://www.shopier.com/51075042" };
  if (!product) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const imageUrl = cover.startsWith("https://") ? cover : site + cover;
    if (!isShopierConfigured()) return { status: "error", message: "Shopier bağlantısı yapılandırılmamış. Ürün linkini yapıştırın." };
    if (!/^https:\/\/(?!localhost)/.test(imageUrl)) return { status: "error", message: "Shopier görseli okuyabilmek için sitenin herkese açık adresi gerekli. Ürünü Shopier’de oluşturup linkini yapıştırın." };
    try {
      product = await getShopier().createProduct({ title: input.title, description: input.description || input.title, priceKurus, imageUrl, hidden: input.hidden });
    } catch {
      return { status: "error", message: "Shopier ürünü oluşturulamadı. Lütfen daha sonra yeniden deneyin." };
    }
  }
  try {
    const [course] = await db.insert(courses).values({
      slug, title: input.title, description: input.description, cover, priceKurus,
      accessDurationDays: input.accessDays, shopierProductId: product.id, shopierUrl: product.url, status: "draft",
    }).returning({ id: courses.id });
    await db.insert(adminAuditLog).values({ actorId: session.user.id, action: "course.create", resourceType: "course", resourceId: course.id, reason: `Shopier ürünü ${product.id}` });
  } catch {
    return { status: "error", message: "Eğitim kaydedilemedi. Bu Shopier ürünü başka bir eğitime bağlı olabilir." };
  }
  revalidatePath("/yonetim/egitimler");
  return { status: "success", message: "Eğitim taslak olarak eklendi. Yayınladığınızda Akademi’de görünür." };
}

const statusSchema = z.object({ courseId: z.uuid(), status: z.enum(["draft", "published", "archived"]) });

export async function setCourseStatus(formData: FormData) {
  const session = await requireOwner();
  const { courseId, status } = statusSchema.parse({ courseId: formData.get("courseId"), status: formData.get("status") });
  const db = getDatabase();
  const [course] = await db.update(courses).set({ status }).where(eq(courses.id, courseId)).returning({ slug: courses.slug });
  if (!course) return;
  await db.insert(adminAuditLog).values({ actorId: session.user.id, action: `course.${status}`, resourceType: "course", resourceId: courseId, reason: "Durum değiştirildi" });
  revalidatePath("/yonetim/egitimler");
  revalidatePath("/akademi");
  revalidatePath(`/akademi/${course.slug}`);
}
