import { eq } from "drizzle-orm";
import { z } from "zod";
import { courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { normalizeSlug } from "../route-slug.ts";

/** By slug; an old link by course id resolves too. */
export async function courseForRoute(db: Database, param: string) {
  const slug = normalizeSlug(param);
  if (!slug) return null;
  const [course] = await db.select().from(courses).where(z.uuid().safeParse(slug).success ? eq(courses.id, slug) : eq(courses.slug, slug)).limit(1);
  return course ?? null;
}
