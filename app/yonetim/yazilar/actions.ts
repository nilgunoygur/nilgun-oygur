"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { articleEdits } from "@/lib/db/schema";

const articleSchema = z.object({
  slug: z.string().min(2).max(180).regex(/^[\p{L}\p{N}-]+$/u).refine(value => value !== "yeni"),
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(70),
  image: z.string().trim().regex(/^\/images\/[\w.-]+$/),
  dateLabel: z.string().trim().min(2).max(50),
  duration: z.string().trim().min(2).max(30),
  body: z.string().trim().min(40).max(100_000),
  status: z.enum(["draft", "published"]),
});

export async function saveArticle(formData: FormData) {
  await requireOwner();
  const article = articleSchema.parse({
    slug: formData.get("slug"), title: formData.get("title"), category: formData.get("category"),
    image: formData.get("image"), dateLabel: formData.get("dateLabel"), duration: formData.get("duration"),
    body: formData.get("body"), status: formData.get("status"),
  });
  await getDatabase().insert(articleEdits).values(article).onConflictDoUpdate({
    target: articleEdits.slug,
    set: { title: article.title, category: article.category, image: article.image, dateLabel: article.dateLabel, duration: article.duration, body: article.body, status: article.status, updatedAt: new Date() },
  });
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath(`/blog/${article.slug}`);
  revalidatePath("/yonetim/yazilar");
  redirect("/yonetim/yazilar");
}
