"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { defaultBanner, type BannerConfig } from "@/lib/announcements";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { bannerSettings } from "@/lib/db/schema";

const hexColor = z.string().regex(/^#[\da-fA-F]{6}$/);
const itemSchema = z.object({
  text: z.string().trim().min(3).max(180),
  href: z.string().trim().max(500).refine(value => !value || /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Geçerli bir site yolu veya HTTPS bağlantısı girin.").transform(value => value || undefined),
});
const bannerSchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
  backgroundColor: hexColor,
  textColor: hexColor,
  accentColor: hexColor,
  animation: z.enum(["scroll", "fade", "static"]),
  speedSeconds: z.coerce.number().int().min(2).max(30),
  loop: z.boolean(),
  pauseOnHover: z.boolean(),
  direction: z.enum(["left", "right"]),
  separator: z.string().trim().min(1).max(3),
});

export type BannerActionState = { message: string; error: boolean; isPublished: boolean };

export async function saveBanner(previous: BannerActionState, formData: FormData): Promise<BannerActionState> {
  await requireOwner();
  const intent = formData.get("intent");
  if (intent !== "save" && intent !== "publish" && intent !== "unpublish") return { ...previous, message: "Geçersiz işlem.", error: true };
  let draft: BannerConfig | undefined;
  if (intent !== "unpublish") {
    let items: unknown;
    try { items = JSON.parse(String(formData.get("items") ?? "")); }
    catch { return { ...previous, message: "Duyuru metinleri okunamadı.", error: true }; }
    const parsed = bannerSchema.safeParse({
      items,
      backgroundColor: formData.get("backgroundColor"),
      textColor: formData.get("textColor"),
      accentColor: formData.get("accentColor"),
      animation: formData.get("animation"),
      speedSeconds: formData.get("speedSeconds"),
      loop: formData.get("loop") === "true",
      pauseOnHover: formData.get("pauseOnHover") === "true",
      direction: formData.get("direction"),
      separator: formData.get("separator"),
    });
    if (!parsed.success) return { ...previous, message: parsed.error.issues[0]?.message ?? "Banner ayarlarını kontrol edin.", error: true };
    draft = parsed.data;
  }

  try {
    const changes = !draft ? { isPublished: false } : intent === "publish" ? { draft, published: draft, isPublished: true } : { draft };
    const [saved] = await getDatabase().insert(bannerSettings)
      .values({ id: 1, draft: draft ?? defaultBanner, published: intent === "publish" ? draft : defaultBanner, isPublished: intent !== "unpublish" })
      .onConflictDoUpdate({ target: bannerSettings.id, set: { ...changes, updatedAt: new Date() } })
      .returning({ isPublished: bannerSettings.isPublished });
    if (intent !== "save") {
      updateTag("public-banner");
      revalidatePath("/", "layout");
    }
    revalidatePath("/yonetim/banner");
    return {
      message: intent === "save" ? "Taslak kaydedildi." : intent === "publish" ? "Banner yayınlandı." : "Banner yayından kaldırıldı.",
      error: false,
      isPublished: saved.isPublished,
    };
  } catch (error) {
    console.error("Banner settings could not be saved.", error);
    return { ...previous, message: "Banner kaydedilemedi. Lütfen tekrar deneyin.", error: true };
  }
}
