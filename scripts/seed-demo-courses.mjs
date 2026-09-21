// Links the hidden [TEST] Shopier products as demo courses and syncs their details. Usage: pnpm run db:seed-demo
import nextEnv from "@next/env";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema.ts";
import { syncCourseFromShopier } from "../lib/akademi/course-sync.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });

const demo = [
  { slug: "test-demo-kurs-1", shopierProductId: "51076812", accessDurationDays: 30 },
  { slug: "test-demo-kurs-2", shopierProductId: "51076813", accessDurationDays: 365 },
  { slug: "test-demo-kurs-3", shopierProductId: "51076814", accessDurationDays: 90 },
  { slug: "test-demo-kurs-4", shopierProductId: "51076937", accessDurationDays: 180 },
];
const synced = [];
for (const course of demo) {
  const values = { ...course, shopierUrl: `https://www.shopier.com/${course.shopierProductId}` };
  const [row] = await db.insert(schema.courses).values({ ...values, title: course.slug, priceKurus: 1 })
    .onConflictDoUpdate({ target: schema.courses.slug, set: values }).returning({ id: schema.courses.id });
  const outcome = await syncCourseFromShopier(db, row.id);
  console.log(course.slug, "→", course.shopierProductId, outcome);
  if (outcome === "updated" || outcome === "unchanged") synced.push(row.id);
}
if (synced.length) await db.update(schema.courses).set({ status: "published" }).where(inArray(schema.courses.id, synced));
await client.end();
