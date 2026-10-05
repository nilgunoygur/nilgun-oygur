import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { io } from "next/cache";
import { config } from "@/lib/config";
import { escapeHtml, isRichHtml } from "@/lib/html";
import { cleanRichHtml, richPlainText } from "@/lib/rich-text";
import { articles as importedArticles } from "@/lib/content";
import { getDatabase } from "@/lib/db";
import { articleAssets, articleEdits } from "@/lib/db/schema";

type Article = (typeof importedArticles)[number] & { richBody?: string };
type Edit = typeof articleEdits.$inferSelect;
export const slugOf = (article: { href: string }) => article.href.slice("/blog/".length);
export const uploadedImagePrefix = "/api/article-images/";
export const articleBodyText = (article: Article) => article.richBody ?? article.body.map(block => block.tag.startsWith("h") ? `<h2>${escapeHtml(block.text)}</h2>` : `<p>${escapeHtml(block.text)}</p>`).join("");


export async function getArticleImageLibrary() {
  await io();
  const assets = await getDatabase().select({ id: articleAssets.id, name: articleAssets.name }).from(articleAssets).orderBy(articleAssets.createdAt);
  const choices = new Map(importedArticles.map(article => [article.image, article.title]));
  for (const asset of assets) choices.set(`${uploadedImagePrefix}${asset.id}`, asset.name);
  return [...choices].map(([url, name]) => ({ url, name }));
}

function mergeArticle(edit: Edit, original?: Article): Article {
  const richBody = isRichHtml(edit.body) ? cleanRichHtml(edit.body) : undefined;
  const plainText = richBody ? richPlainText(richBody) : "";
  return {
    href: `/blog/${edit.slug}`,
    title: edit.title,
    category: edit.category,
    date: edit.dateLabel,
    duration: edit.duration,
    image: edit.image,
    authorImage: original?.authorImage ?? importedArticles[0].authorImage,
    body: richBody ? [{ tag: "p", text: plainText.slice(0, 240) }] : edit.body.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean).map(value => value.startsWith("## ") ? { tag: "h2", text: value.slice(3) } : { tag: "p", text: value }),
    richBody,
  };
}

async function savedArticles(strict = false) {
  if (!config().databaseUrl) return [] as Edit[];
  await io();
  try {
    return await getDatabase().select().from(articleEdits);
  } catch (error) {
    if (strict) throw error;
    console.error("Article edits are unavailable; serving imported articles.", error);
    return [] as Edit[];
  }
}

export const getPublicArticles = cache(async (): Promise<Article[]> => {
  const edits = await savedArticles();
  const bySlug = new Map(edits.map(edit => [edit.slug, edit]));
  const base = importedArticles.flatMap(article => {
    const edit = bySlug.get(slugOf(article));
    return edit?.status === "draft" ? [] : [edit ? mergeArticle(edit, article) : article];
  });
  const importedSlugs = new Set(importedArticles.map(slugOf));
  return [...base, ...edits.filter(edit => !importedSlugs.has(edit.slug) && edit.status === "published").map(edit => mergeArticle(edit))];
});

export async function getManagedArticles() {
  const edits = await savedArticles(true);
  const bySlug = new Map(edits.map(edit => [edit.slug, edit]));
  const importedSlugs = new Set(importedArticles.map(slugOf));
  return [
    ...importedArticles.map(article => {
      const edit = bySlug.get(slugOf(article));
      return { article: edit ? mergeArticle(edit, article) : article, status: edit?.status ?? "published", imported: true };
    }),
    ...edits.filter(edit => !importedSlugs.has(edit.slug)).map(edit => ({ article: mergeArticle(edit), status: edit.status, imported: false })),
  ];
}

export async function getManagedArticle(slug: string) {
  const original = importedArticles.find(article => slugOf(article) === slug);
  if (!config().databaseUrl) return original ? { article: original, status: "published" } : null;
  await io();
  const [edit] = await getDatabase().select().from(articleEdits).where(eq(articleEdits.slug, slug)).limit(1);
  return edit ? { article: mergeArticle(edit, original), status: edit.status } : original ? { article: original, status: "published" } : null;
}
