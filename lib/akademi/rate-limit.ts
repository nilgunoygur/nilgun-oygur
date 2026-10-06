import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { rateLimit } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

/** Fixed-window limiter on Better Auth's database-backed rate_limit table; true while under `max`. */
export async function consumeAttempt(db: Database, key: string, { max, windowMs, now = Date.now() }: { max: number; windowMs: number; now?: number }) {
  const expired = sql`${rateLimit.lastRequest} < ${now - windowMs}`;
  const [row] = await db.insert(rateLimit).values({ id: key, key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${expired} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    }).returning({ count: rateLimit.count });
  return row.count <= max;
}

/** A keyed hash of the visitor's IP, so limits are kept without storing addresses. */
export const visitorKey = (headers: Headers, secret: string) =>
  createHmac("sha256", secret).update(headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local").digest("hex");
