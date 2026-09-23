"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
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
    const db = getDatabase();
    const [current] = await db.select().from(bannerSettings).where(eq(bannerSettings.id, 1)).limit(1);
    if (!current) {
      await db.insert(bannerSettings).values({
        id: 1,
        draft: draft ?? defaultBanner,
        published: intent === "publish" ? draft! : defaultBanner,
        isPublished: intent !== "unpublish",
      });
    } else if (intent === "unpublish") {
      await db.update(bannerSettings).set({ isPublished: false, updatedAt: new Date() }).where(eq(bannerSettings.id, 1));
    } else if (intent === "publish") {
      await db.update(bannerSettings).set({ draft: draft!, published: draft!, isPublished: true, updatedAt: new Date() }).where(eq(bannerSettings.id, 1));
    } else {
      await db.update(bannerSettings).set({ draft: draft!, updatedAt: new Date() }).where(eq(bannerSettings.id, 1));
    }
    if (intent !== "save") {
      updateTag("public-banner");
      revalidatePath("/", "layout");
    }
    revalidatePath("/yonetim/banner");
    return {
      message: intent === "save" ? "Taslak kaydedildi." : intent === "publish" ? "Banner yayınlandı." : "Banner yayından kaldırıldı.",
      error: false,
      isPublished: intent === "save" ? current?.isPublished ?? true : intent === "publish",
    };
  } catch (error) {
    console.error("Banner settings could not be saved.", error);
    return { ...previous, message: "Banner kaydedilemedi. Lütfen tekrar deneyin.", error: true };
  }
}
