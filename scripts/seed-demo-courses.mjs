// Links the hidden [TEST] Shopier products as published demo courses, then copies their title,
// description, image and price from Shopier. Safe to re-run.
// Usage: pnpm run db:seed-demo
import nextEnv from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema.ts";
import { syncAllCoursesFromShopier } from "../lib/akademi/course-sync.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });

// Created through the Shopier API with customListing=true: hidden from the public Shopier store.
// Earlier test products 51075042, 51075057 and 51075059 were replaced by these.
const demo = [
  { slug: "test-demo-kurs-1", shopierProductId: "51076812", accessDurationDays: 30 },
  { slug: "test-demo-kurs-2", shopierProductId: "51076813", accessDurationDays: 365 },
  { slug: "test-demo-kurs-3", shopierProductId: "51076814", accessDurationDays: 90 },
];
for (const course of demo) {
  const values = { ...course, shopierUrl: `https://www.shopier.com/${course.shopierProductId}`, status: "published" };
  const [existing] = await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, course.slug));
  if (existing) await db.update(schema.courses).set(values).where(eq(schema.courses.id, existing.id));
  // Placeholder title and price until the Shopier sync below fills in the real values.
  else await db.insert(schema.courses).values({ ...values, title: course.slug, priceKurus: 1 });
}
console.log("Demo courses linked:", demo.map(d => `${d.slug} → ${d.shopierProductId}`).join(", "));
console.log("Shopier sync:", await syncAllCoursesFromShopier(db));
await client.end();
