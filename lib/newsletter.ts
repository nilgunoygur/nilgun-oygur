import { asc, count, desc, eq, gte, ilike, max, sql } from "drizzle-orm";
import { audited } from "./db/audit.ts";
import { newsletterSubscribers } from "./db/schema.ts";
import { containsPattern } from "./db/search.ts";
import type { Database } from "./db/types.ts";

export const subscriberPageSizes = [10, 25, 50, 100];
export const defaultSubscriberPageSize = 25;
export const subscriberSortColumns = ["email", "createdAt"] as const;
type SubscriberList = { q?: string; page?: number; perPage?: number; sort?: { id: (typeof subscriberSortColumns)[number]; desc: boolean }[] };

export async function subscribe(db: Database, email: string) {
  await db.insert(newsletterSubscribers).values({ email: email.trim().toLowerCase() }).onConflictDoNothing({ target: newsletterSubscribers.email });
}

/** The audit entry keeps only the id, so the address itself is gone. */
export function removeSubscriber(db: Database, actorId: string, subscriberId: string) {
  return audited(db, actorId, { action: "newsletter.subscriber_removed", resourceType: "newsletter_subscriber", resourceId: subscriberId, reason: "Bülten abonesi listeden silindi" },
    async tx => (await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId)).returning({ id: newsletterSubscribers.id })).length > 0);
}

/** A page past the end shows the last page. */
export async function listSubscribers(db: Database, { q = "", page = 1, perPage = defaultSubscriberPageSize, sort = [] }: SubscriberList, now = new Date()) {
  if (!subscriberPageSizes.includes(perPage)) perPage = defaultSubscriberPageSize;
  const search = q.trim().slice(0, 100);
  const where = search ? ilike(newsletterSubscribers.email, containsPattern(search)) : undefined;
  const [{ matching, ...summary }] = await db.select({
    total: count(),
    matching: sql<number>`count(*) filter (where ${where ?? sql`true`})`.mapWith(Number),
    recent: sql<number>`count(*) filter (where ${gte(newsletterSubscribers.createdAt, new Date(now.getTime() - 30 * 86_400_000))})`.mapWith(Number),
    latest: max(newsletterSubscribers.createdAt),
  }).from(newsletterSubscribers);
  const pages = Math.max(1, Math.ceil(matching / perPage));
  page = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const order = sort.length ? sort.map(({ id, desc: descending }) => (descending ? desc : asc)(newsletterSubscribers[id])) : [desc(newsletterSubscribers.createdAt)];
  const subscribers = await db.select().from(newsletterSubscribers).where(where)
    .orderBy(...order, newsletterSubscribers.id).limit(perPage).offset((page - 1) * perPage);
  return { page, pages, ...summary, subscribers };
}

/** The BOM lets Excel read Turkish characters. */
export async function subscribersCsv(db: Database) {
  const rows = await db.select({ email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt })
    .from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt), newsletterSubscribers.id);
  // A leading quote stops spreadsheets from running a cell as a formula.
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return `\uFEFF${[["E-posta", "Kayıt tarihi"], ...rows.map(row => [row.email, row.createdAt.toISOString()])].map(row => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
