import { setTimeout } from "node:timers/promises";
import { asc, count, desc, eq, gte, ilike, max, sql } from "drizzle-orm";
import { audited } from "./db/audit.ts";
import { newsletterSubscribers } from "./db/schema.ts";
import { containsPattern } from "./db/search.ts";
import type { Database } from "./db/types.ts";

export const subscriberPageSizes = [10, 25, 50, 100];
export const defaultSubscriberPageSize = 25;
export const subscriberSortColumns = ["email", "createdAt"] as const;
type SubscriberList = { q?: string; page?: number; perPage?: number; sort?: { id: (typeof subscriberSortColumns)[number]; desc: boolean }[] };

export type SubscriberKind = "visitor" | "member" | "buyer";
/** The Resend contact property that carries the kind. */
export const kindProperty = "member_type";
// Qualified by hand: the subqueries read the same column names as the outer table.
const kind = sql<SubscriberKind>`case
  when exists (select 1 from shopier_purchases p where p.buyer_email = newsletter_subscribers.email
    or p.user_id in (select u.id from "user" u where u.email = newsletter_subscribers.email)) then 'buyer'
  when exists (select 1 from "user" u where u.email = newsletter_subscribers.email) then 'member'
  else 'visitor' end`;

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
  const subscribers = await db.select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt, kind }).from(newsletterSubscribers).where(where)
    .orderBy(...order, newsletterSubscribers.id).limit(perPage).offset((page - 1) * perPage);
  return { page, pages, ...summary, subscribers };
}

/** The BOM lets Excel read Turkish characters. */
export async function subscribersCsv(db: Database) {
  const rows = await db.select({ email: newsletterSubscribers.email, kind, createdAt: newsletterSubscribers.createdAt })
    .from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt), newsletterSubscribers.id);
  // A leading quote stops spreadsheets from running a cell as a formula.
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return `\uFEFF${[["E-posta", "Tür", "Kayıt tarihi"], ...rows.map(row => [row.email, row.kind, row.createdAt.toISOString()])].map(row => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

type ContactResult = Promise<{ error: unknown }>;
/** The part of Resend's contacts API the sync uses. */
export type ResendContacts = {
  create(contact: { email: string; properties: Record<string, string> }): ContactResult;
  update(contact: { email: string; properties: Record<string, string> }): ContactResult;
};

/** Sends subscribers whose kind is new or has changed to Resend; a failed one stays pending for the next run. */
export async function syncContacts(db: Database, contacts: ResendContacts, { limit = 40, pauseMs = 600, wait = setTimeout as (ms: number) => Promise<unknown> } = {}) {
  const pending = await db.select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email, syncedKind: newsletterSubscribers.syncedKind, kind })
    .from(newsletterSubscribers).where(sql`${newsletterSubscribers.syncedKind} is distinct from ${kind}`).orderBy(newsletterSubscribers.createdAt).limit(limit);
  let synced = 0;
  for (const [index, row] of pending.entries()) {
    // Resend allows a few requests per second.
    if (index) await wait(pauseMs);
    const contact = { email: row.email, properties: { [kindProperty]: row.kind } };
    // Creating also updates an address Resend already has; later changes only touch the property.
    if ((await (row.syncedKind ? contacts.update(contact) : contacts.create(contact))).error) continue;
    await db.update(newsletterSubscribers).set({ syncedKind: row.kind }).where(eq(newsletterSubscribers.id, row.id));
    synced++;
  }
  return { pending: pending.length, synced };
}
