import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";
import { getShopier } from "@/lib/shopier";
import { claimPurchasesByEmail, claimShopierOrder, recordShopierOrder } from "./purchases";
import { syncAllCoursesFromShopier, syncCourseFromShopier } from "./course-sync";

const HOUR = 3_600_000;

/** Call only with a verified session. */
export function claimPendingPurchases(userId: string, verifiedEmail: string) {
  return claimPurchasesByEmail(getDatabase(), userId, verifiedEmail);
}

export async function claimOrderForStudent(orderNumber: string, shopierEmail: string, userId: string) {
  return claimShopierOrder(getDatabase(), await getShopier().getOrder(orderNumber.trim()), shopierEmail, userId);
}

/** Replays recent orders and refreshes course details; idempotent. */
export async function syncRecentShopierOrders(days = 7) {
  const orders = await getShopier().listOrdersSince(new Date(Date.now() - days * 24 * HOUR));
  const db = getDatabase();
  let purchases = 0, granted = 0;
  for (const order of orders) {
    const result = await recordShopierOrder(db, order);
    purchases += result.purchaseIds.length;
    granted += result.granted;
  }
  return { orders: orders.length, purchases, granted, courses: await syncAllCoursesFromShopier(db) };
}

export function refreshCourseFromShopier(courseId: string) {
  return syncCourseFromShopier(getDatabase(), courseId);
}

/** Five order-claim attempts per student per hour. */
export async function consumeClaimAttempt(userId: string) {
  const key = `shopier-claim:${userId}`;
  const now = Date.now();
  const expired = sql`${rateLimit.lastRequest} < ${now - HOUR}`;
  const [row] = await getDatabase().insert(rateLimit).values({ id: key, key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${expired} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    }).returning({ count: rateLimit.count });
  return row.count <= 5;
}
