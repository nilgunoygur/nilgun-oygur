// Read-only: checks a real paid order against the Shopier API and database receipts.
import nextEnv from "@next/env";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createShopierClient } from "../lib/shopier/api.ts";
import { verifyShopierDelivery } from "../lib/akademi/delivery-verification.ts";
import { verifiedDatabaseUrl } from "../lib/db/connection-url.ts";
import * as schema from "../lib/db/schema.ts";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const orderId = process.argv[2];
if (!/^\d{1,20}$/.test(orderId ?? "")) throw new Error("Usage: pnpm shopier:verify <real-order-number>");
if (!process.env.DATABASE_URL || !process.env.SHOPIER_API_TOKEN) throw new Error("Configure DATABASE_URL and SHOPIER_API_TOKEN for the environment being verified.");
const pool = new pg.Pool({ connectionString: verifiedDatabaseUrl(process.env.DATABASE_URL), max: 1 });
try {
  const order = await createShopierClient(process.env.SHOPIER_API_TOKEN).getOrder(orderId);
  if (!order) throw new Error("Shopier order not found.");
  const result = await verifyShopierDelivery(drizzle(pool, { schema }), order);
  console.log(JSON.stringify(result, null, 2));
  if (!result.verified) process.exitCode = 1;
} catch {
  console.error("Delivery verification could not complete. Check the order number, environment and migration; no changes were made.");
  process.exitCode = 1;
} finally { await pool.end(); }
