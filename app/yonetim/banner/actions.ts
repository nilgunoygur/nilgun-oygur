"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { z } from "zod";
import { defaultBanner, type BannerConfig } from "@/lib/announcements";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { bannerSettings } from "@/lib/db/schema";
import { bannerSchema } from "@/lib/akademi/owner-forms";

export type BannerActionState = { message: string; error: boolean; isPublished: boolean };

export async function saveBanner(intent: "save" | "publish" | "unpublish", values: z.input<typeof bannerSchema> | null, isPublished: boolean): Promise<BannerActionState> {
  await requireOwner();
  const fail = (message: string): BannerActionState => ({ message, error: true, isPublished });
  if (intent !== "save" && intent !== "publish" && intent !== "unpublish") return fail("Geçersiz işlem.");
  let draft: BannerConfig | undefined;
  if (intent !== "unpublish") {
    const parsed = bannerSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Banner ayarlarını kontrol edin.");
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
    return fail("Banner kaydedilemedi. Lütfen tekrar deneyin.");
  }
}
