import { asc, count, desc, eq, gte, ilike, max, sql } from "drizzle-orm";
import { audited } from "./akademi/owner-commands.ts";
import { newsletterSubscribers } from "./db/schema.ts";
import { containsPattern } from "./db/search.ts";
import type { Database } from "./db/types.ts";

export const subscriberPageSizes = [10, 25, 50, 100];
export const defaultSubscriberPageSize = 25;
const sortable = { email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt };
export const subscriberSortColumns = Object.keys(sortable) as (keyof typeof sortable)[];
type SubscriberList = { q?: string; page?: number; perPage?: number; sort?: { id: keyof typeof sortable; desc: boolean }[] };

/** A repeat sign-up changes nothing. */
export async function subscribe(db: Database, email: string) {
  await db.insert(newsletterSubscribers).values({ email: email.trim().toLowerCase() }).onConflictDoNothing({ target: newsletterSubscribers.email });
}

/** The audit entry keeps only the id, so the address itself is gone. */
export function removeSubscriber(db: Database, actorId: string, subscriberId: string) {
  return audited(db, actorId, { action: "newsletter.subscriber_removed", resourceType: "newsletter_subscriber", resourceId: subscriberId, reason: "Bülten abonesi listeden silindi" },
    async tx => (await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId)).returning({ id: newsletterSubscribers.id })).length > 0);
}

/** Newest first unless sorted; a page past the end shows the last page. */
export async function listSubscribers(db: Database, { q = "", page = 1, perPage = defaultSubscriberPageSize, sort = [] }: SubscriberList, now = new Date()) {
  if (!subscriberPageSizes.includes(perPage)) perPage = defaultSubscriberPageSize;
  const search = q.trim().slice(0, 100);
  const where = search ? ilike(newsletterSubscribers.email, containsPattern(search)) : undefined;
  const [totals] = await db.select({
    all: count(),
    matching: sql<number>`count(*) filter (where ${where ?? sql`true`})`.mapWith(Number),
    recent: sql<number>`count(*) filter (where ${gte(newsletterSubscribers.createdAt, new Date(now.getTime() - 30 * 86_400_000))})`.mapWith(Number),
    latest: max(newsletterSubscribers.createdAt),
  }).from(newsletterSubscribers);
  const pages = Math.max(1, Math.ceil(totals.matching / perPage));
  page = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const order = sort.length ? sort.map(({ id, desc: descending }) => (descending ? desc : asc)(sortable[id])) : [desc(newsletterSubscribers.createdAt)];
  const subscribers = await db.select().from(newsletterSubscribers).where(where)
    .orderBy(...order, newsletterSubscribers.id).limit(perPage).offset((page - 1) * perPage);
  return { page, pages, total: totals.all, recent: totals.recent, latest: totals.latest, subscribers };
}

/** Newest first; the BOM lets Excel read Turkish characters. */
export async function subscribersCsv(db: Database) {
  const rows = await db.select({ email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt })
    .from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt), newsletterSubscribers.id);
  // A leading quote stops spreadsheets from running a cell as a formula.
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return `﻿${[["E-posta", "Kayıt tarihi"], ...rows.map(row => [row.email, row.createdAt.toISOString()])].map(row => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
