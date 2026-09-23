import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "@/lib/config";
import { verifiedDatabaseUrl } from "./connection-url";
import * as schema from "./schema";

const createDatabase = () => {
  const url = config().databaseUrl;
  if (!url) throw new Error("DATABASE_URL is required for Akademi database operations.");
  // Neon pooled URL. One pool per Fluid compute instance; Vercel closes idle clients before the instance suspends.
  const pool = new Pool({ connectionString: verifiedDatabaseUrl(url), max: 5, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
};
const globalDatabase = globalThis as typeof globalThis & {
  academyDatabase?: ReturnType<typeof createDatabase>;
};

// Lazy initialization keeps existing public pages buildable without academy credentials.
export function getDatabase() {
  return globalDatabase.academyDatabase ??= createDatabase();
}
