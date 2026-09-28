"use server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { articleAssets, articleEdits } from "@/lib/db/schema";
import { articles as importedArticles } from "@/lib/content";
import { articleSlug } from "@/lib/akademi/slug";
import { dayLabel } from "@/lib/akademi/format";
import { articlePlainText, cleanArticleHtml, slugOf, uploadedImagePrefix } from "@/lib/articles";
import { articleMinLength, articleSchema, articleStatus } from "@/lib/akademi/owner-forms";
import type { FormState } from "@/components/akademi/form-status";

export async function saveArticle(values: z.input<typeof articleSchema>, requestedStatus: z.input<typeof articleStatus>, originalSlug = ""): Promise<FormState> {
  await requireOwner();
  const parsed = articleSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Yazı alanlarını kontrol edin." };
  const article = { ...parsed.data, status: articleStatus.parse(requestedStatus) };
  const body = cleanArticleHtml(article.body);
  if (articlePlainText(body).length < articleMinLength.length) return { status: "error", message: articleMinLength.message };
  if (article.image.startsWith(uploadedImagePrefix)) {
    const imageId = article.image.slice(uploadedImagePrefix.length);
    const [found] = await getDatabase().select({ id: articleAssets.id }).from(articleAssets).where(eq(articleAssets.id, imageId)).limit(1);
    if (!found) return { status: "error", message: "Kapak görseli bulunamadı." };
  }
  const allSlugs = new Set([...importedArticles.map(item => slugOf(item)), ...(await getDatabase().select({ slug: articleEdits.slug }).from(articleEdits)).map(item => item.slug)]);
  const baseSlug = articleSlug(article.title);
  let slug = originalSlug && allSlugs.has(originalSlug) ? originalSlug : baseSlug;
  if (!originalSlug) for (let suffix = 2; allSlugs.has(slug) || slug === "yeni"; suffix++) slug = `${baseSlug}-${suffix}`;
  const fields = { title: article.title, category: article.category, image: article.image, dateLabel: dayLabel.format(new Date(`${article.date}T12:00:00+03:00`)), duration: `${article.durationAmount} ${article.durationUnit === "hour" ? "saat" : "dk."}`, body, status: article.status };
  await getDatabase().insert(articleEdits).values({ slug, ...fields }).onConflictDoUpdate({ target: articleEdits.slug, set: { ...fields, updatedAt: new Date() } });
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/yonetim/yazilar");
  return { status: "success", message: "" };
}
