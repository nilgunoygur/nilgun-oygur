// Links the hidden [TEST] Shopier products as published demo courses with their Shopier details. Usage: pnpm run db:seed-demo
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema.ts";
import { createShopierClient, productDetails } from "../lib/shopier/api.ts";
import { courseFieldsFromProduct } from "../lib/akademi/course-sync.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });
const shopier = createShopierClient(process.env.SHOPIER_API_TOKEN ?? "");

const demo = [
  { slug: "test-demo-kurs-1", shopierProductId: "51076812", accessDurationDays: 30 },
  { slug: "test-demo-kurs-2", shopierProductId: "51076813", accessDurationDays: 365 },
  { slug: "test-demo-kurs-3", shopierProductId: "51076814", accessDurationDays: 90 },
  { slug: "test-demo-kurs-4", shopierProductId: "51076937", accessDurationDays: 180 },
];
for (const course of demo) {
  const product = await shopier.getProduct(course.shopierProductId);
  const details = product && productDetails(product);
  if (!details) { console.log(course.slug, "→", course.shopierProductId, "not found"); continue; }
  const values = { ...course, ...courseFieldsFromProduct(details, null), shopierUrl: `https://www.shopier.com/${course.shopierProductId}`, status: "published" };
  await db.insert(schema.courses).values(values).onConflictDoUpdate({ target: schema.courses.slug, set: values });
  console.log(course.slug, "→", course.shopierProductId, details.title);
}
await client.end();
