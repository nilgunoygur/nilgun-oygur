import "server-only";
import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { getShopier } from "@/lib/shopier";
import { createAkademi, type Akademi } from "./akademi";
import { CATALOG_TAG, type CatalogCourse } from "./catalog";

// The server-only edge of the composition root: the env-built Akademi, and the cached catalog reads.

let instance: Akademi | undefined;
export function akademi() {
  return instance ??= createAkademi({ db: getDatabase(), shopier: getShopier(), config: config() });
}

const catalogLife = { stale: 300, revalidate: 600, expire: 86_400 };

export async function listCatalog(): Promise<CatalogCourse[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife(catalogLife);
  return config().enabled.catalog ? akademi().catalog.list() : [];
}

export async function getCatalogCourse(rawSlug: string): Promise<CatalogCourse | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife(catalogLife);
  return config().enabled.catalog ? akademi().catalog.find(rawSlug) : null;
}

/** Prerenders every published course page; unknown slugs render on first visit. Cache Components needs at least one param. */
export async function catalogStaticParams() {
  const courses = await listCatalog();
  return courses.length ? courses.map(course => ({ slug: course.slug })) : [{ slug: "_" }];
}

/** Course title and cover by Shopier product id; empty when the catalog is unavailable. */
export async function courseCards(): Promise<Record<string, { title: string; image: string }>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife(catalogLife);
  if (!config().enabled.catalog) return {};
  try { return await akademi().catalog.cards(); } catch { return {}; }
}

/** From a Server Function: the next render reads fresh data. */
export function catalogChangedByOwner() {
  updateTag(CATALOG_TAG);
}

/** From a route handler (webhook, cron): serve stale while the catalog refreshes in the background. */
export function catalogChangedByProvider() {
  revalidateTag(CATALOG_TAG, "max");
}
