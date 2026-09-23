import "server-only";
import { cacheLife, cacheTag, io } from "next/cache";
import { eq } from "drizzle-orm";
import { defaultBanner } from "@/lib/announcements";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { bannerSettings } from "@/lib/db/schema";

async function readSettings() {
  if (!config().databaseUrl) return null;
  const [settings] = await getDatabase().select().from(bannerSettings).where(eq(bannerSettings.id, 1)).limit(1);
  return settings ?? null;
}

export async function getPublishedBanner() {
  "use cache";
  cacheLife("minutes");
  cacheTag("public-banner");
  try {
    const settings = await readSettings();
    if (!settings) return defaultBanner;
    return settings.isPublished ? settings.published ?? defaultBanner : null;
  } catch (error) {
    console.error("Banner settings unavailable; hiding the banner.", error);
    return null;
  }
}

export async function getManagedBanner() {
  await io();
  const settings = await readSettings();
  return { draft: settings?.draft ?? defaultBanner, isPublished: settings?.isPublished ?? true };
}
