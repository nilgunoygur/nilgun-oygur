import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { verifiedDatabaseUrl } from "./lib/db/connection-url";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  // Generation is offline. Migration commands require a real connection string.
  dbCredentials: { url: verifiedDatabaseUrl(process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "") },
  strict: true,
  verbose: true,
});
