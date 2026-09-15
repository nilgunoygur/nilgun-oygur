import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const createDatabase = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Akademi database operations.");
  // Neon pooled URL in deployment; small per-instance pool and no prepared statements.
  const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return drizzle(client, { schema });
};
const globalDatabase = globalThis as typeof globalThis & {
  academyDatabase?: ReturnType<typeof createDatabase>;
};

// Lazy initialization keeps existing public pages buildable without academy credentials.
export function getDatabase() {
  return globalDatabase.academyDatabase ??= createDatabase();
}
