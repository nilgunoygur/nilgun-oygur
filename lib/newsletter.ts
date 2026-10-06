import { asc, count, desc, gte, ilike, max, sql } from "drizzle-orm";
import { newsletterSubscribers } from "./db/schema.ts";
import type { Database } from "./db/types.ts";

/** `sort` is "column.asc" or "column.desc", comma-separated, as the owner table writes it to the URL. */
export type SubscriberListParams = { q?: string; page?: string; perPage?: string; sort?: string };
export const subscriberPageSizes = [10, 25, 50, 100];
export const defaultSubscriberPageSize = 25;
const sortable = { email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt };

/** A single statement, so it needs no transaction on the pooled connection; a repeat sign-up changes nothing. */
export async function subscribe(db: Database, email: string) {
  await db.insert(newsletterSubscribers).values({ email: email.trim().toLowerCase() }).onConflictDoNothing({ target: newsletterSubscribers.email });
}

/** Newest first unless sorted; a page past the end shows the last page. */
export async function listSubscribers(db: Database, params: SubscriberListParams, now = new Date()) {
  const q = (params.q ?? "").trim().slice(0, 100);
  const perPage = subscriberPageSizes.includes(Number(params.perPage)) ? Number(params.perPage) : defaultSubscriberPageSize;
  const order = (params.sort ?? "").split(",").flatMap(item => {
    const [id, direction] = item.split(".");
    if (!Object.hasOwn(sortable, id) || (direction !== "asc" && direction !== "desc")) return [];
    const column = sortable[id as keyof typeof sortable];
    return [direction === "asc" ? asc(column) : desc(column)];
  });
  const where = q ? ilike(newsletterSubscribers.email, `%${q.replace(/[\\%_]/g, "\\$&")}%`) : undefined;
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
  const [totals] = await db.select({
    all: count(),
    matching: sql<number>`count(*) filter (where ${where ?? sql`true`})`.mapWith(Number),
    recent: sql<number>`count(*) filter (where ${gte(newsletterSubscribers.createdAt, monthAgo)})`.mapWith(Number),
    latest: max(newsletterSubscribers.createdAt),
  }).from(newsletterSubscribers);
  const pages = Math.max(1, Math.ceil(totals.matching / perPage));
  const page = Math.min(Math.max(1, Number.parseInt(params.page ?? "", 10) || 1), pages);
  const subscribers = await db.select().from(newsletterSubscribers).where(where)
    .orderBy(...(order.length ? order : [desc(newsletterSubscribers.createdAt)]), newsletterSubscribers.id).limit(perPage).offset((page - 1) * perPage);
  return { filter: { q, page, perPage }, total: totals.all, recent: totals.recent, latest: totals.latest, matching: totals.matching, pages, subscribers };
}

/** Every subscriber, newest first, as a CSV that Excel opens with Turkish characters intact. */
export async function subscribersCsv(db: Database) {
  const rows = await db.select({ email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt })
    .from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt), newsletterSubscribers.id);
  // A leading quote stops spreadsheets from running a cell as a formula.
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return `﻿${[["E-posta", "Kayıt tarihi"], ...rows.map(row => [row.email, row.createdAt.toISOString()])].map(row => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
