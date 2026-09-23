"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { articleAssets, articleEdits } from "@/lib/db/schema";
import { articles as importedArticles } from "@/lib/content";
import { articleSlugFromTitle } from "@/lib/article-slug";
import { cleanArticleHtml } from "@/lib/articles";
import sanitizeHtml from "sanitize-html";

const articleSchema = z.object({
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(70),
  image: z.string().trim().regex(/^(\/images\/[\w.-]+|\/api\/article-images\/[0-9a-f-]{36})$/i),
  date: z.iso.date(),
  durationAmount: z.coerce.number().int().min(1).max(999),
  durationUnit: z.enum(["minute", "hour"]),
  body: z.string().trim().max(100_000),
  status: z.enum(["draft", "published"]),
});
const dateLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

export async function saveArticle(formData: FormData) {
  await requireOwner();
  const article = articleSchema.parse({
    title: formData.get("title"), category: formData.get("category"),
    image: formData.get("image"), date: formData.get("date"), durationAmount: formData.get("durationAmount"), durationUnit: formData.get("durationUnit"),
    body: formData.get("body"), status: formData.get("status"),
  });
  const body = cleanArticleHtml(article.body);
  const bodyText = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
  if (bodyText.length < 40) throw new Error("Yazı içeriği en az 40 karakter olmalıdır.");
  if (article.image.startsWith("/api/article-images/")) {
    const imageId = article.image.slice("/api/article-images/".length);
    const [found] = await getDatabase().select({ id: articleAssets.id }).from(articleAssets).where(eq(articleAssets.id, imageId)).limit(1);
    if (!found) throw new Error("Kapak görseli bulunamadı.");
  }
  const originalSlug = String(formData.get("originalSlug") ?? "");
  const allSlugs = new Set([...importedArticles.map(item => item.href.slice(6)), ...(await getDatabase().select({ slug: articleEdits.slug }).from(articleEdits)).map(item => item.slug)]);
  const baseSlug = articleSlugFromTitle(article.title);
  let slug = originalSlug && allSlugs.has(originalSlug) ? originalSlug : baseSlug;
  if (!originalSlug) for (let suffix = 2; allSlugs.has(slug) || slug === "yeni"; suffix++) slug = `${baseSlug}-${suffix}`;
  const saved = { slug, title: article.title, category: article.category, image: article.image, dateLabel: dateLabel.format(new Date(`${article.date}T12:00:00+03:00`)), duration: `${article.durationAmount} ${article.durationUnit === "hour" ? "saat" : "dk."}`, body, status: article.status };
  await getDatabase().insert(articleEdits).values(saved).onConflictDoUpdate({
    target: articleEdits.slug,
    set: { title: saved.title, category: saved.category, image: saved.image, dateLabel: saved.dateLabel, duration: saved.duration, body: saved.body, status: saved.status, updatedAt: new Date() },
  });
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/yonetim/yazilar");
  redirect("/yonetim/yazilar");
}
