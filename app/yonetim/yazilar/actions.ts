"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function saveArticle(values: z.input<typeof articleSchema>, requestedStatus: z.input<typeof articleStatus>, originalSlug = "") {
  await requireOwner();
  const article = { ...articleSchema.parse(values), status: articleStatus.parse(requestedStatus) };
  const body = cleanArticleHtml(article.body);
  if (articlePlainText(body).length < articleMinLength.length) throw new Error(articleMinLength.message);
  if (article.image.startsWith(uploadedImagePrefix)) {
    const imageId = article.image.slice(uploadedImagePrefix.length);
    const [found] = await getDatabase().select({ id: articleAssets.id }).from(articleAssets).where(eq(articleAssets.id, imageId)).limit(1);
    if (!found) throw new Error("Kapak görseli bulunamadı.");
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
  redirect("/yonetim/yazilar");
}
