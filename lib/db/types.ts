import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema.ts";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
