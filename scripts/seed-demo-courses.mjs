// Adds the hidden [TEST] Shopier products as published demo courses in the configured database.
// Usage: pnpm run db:seed-demo   (development/preview databases only)
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });

// Created through the Shopier API with customListing=true: hidden from the public Shopier store.
const demo = [
  { shopierProductId: "51075042", slug: "test-demo-kurs-1", title: "[TEST] Akademi Demo Kurs 1", priceKurus: 100, accessDurationDays: 30, cover: "/images/akademi/academy-art-v1.png" },
  { shopierProductId: "51075057", slug: "test-demo-kurs-2", title: "[TEST] Akademi Demo Kurs 2 - Video Eğitimi", priceKurus: 200, accessDurationDays: 365, cover: "/images/akademi/bioenerji-v1.png" },
  { shopierProductId: "51075059", slug: "test-demo-kurs-3", title: "[TEST] Akademi Demo Kurs 3 - Canlı Atölye", priceKurus: 300, accessDurationDays: 90, cover: "/images/akademi/dogal-tas-v1.png" },
];
const rows = await db.insert(schema.courses).values(demo.map(course => ({
  ...course,
  description: "Test ürünüdür, satın almayınız. Shopier satın alma ve erişim akışını denemek için kullanılır.",
  shopierUrl: `https://www.shopier.com/${course.shopierProductId}`,
  status: "published",
}))).onConflictDoNothing().returning({ slug: schema.courses.slug });
console.log(`Added ${rows.length} demo course(s): ${rows.map(r => r.slug).join(", ") || "none (already present)"}`);
await client.end();
