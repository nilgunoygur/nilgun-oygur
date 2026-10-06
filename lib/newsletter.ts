import { count, desc, ilike, sql } from "drizzle-orm";
import { newsletterSubscribers } from "./db/schema.ts";
import type { Database } from "./db/types.ts";

export type SubscriberListParams = { q?: string; page?: string };
const perPage = 25;

/** A single statement, so it needs no transaction on the pooled connection; a repeat sign-up changes nothing. */
export async function subscribe(db: Database, email: string) {
  await db.insert(newsletterSubscribers).values({ email: email.trim().toLowerCase() }).onConflictDoNothing({ target: newsletterSubscribers.email });
}

/** Newest first; a page past the end shows the last page. */
export async function listSubscribers(db: Database, params: SubscriberListParams) {
  const q = (params.q ?? "").trim().slice(0, 100);
  const where = q ? ilike(newsletterSubscribers.email, `%${q.replace(/[\\%_]/g, "\\$&")}%`) : undefined;
  const [totals] = await db.select({ all: count(), matching: sql<number>`count(*) filter (where ${where ?? sql`true`})`.mapWith(Number) }).from(newsletterSubscribers);
  const pages = Math.max(1, Math.ceil(totals.matching / perPage));
  const page = Math.min(Math.max(1, Number.parseInt(params.page ?? "", 10) || 1), pages);
  const subscribers = await db.select().from(newsletterSubscribers).where(where)
    .orderBy(desc(newsletterSubscribers.createdAt), newsletterSubscribers.id).limit(perPage).offset((page - 1) * perPage);
  return { filter: { q, page }, total: totals.all, matching: totals.matching, pages, subscribers };
}
