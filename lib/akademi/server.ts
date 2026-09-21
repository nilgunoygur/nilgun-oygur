import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";
import { getShopier } from "@/lib/shopier";
import { claimPurchasesByEmail, claimShopierOrder, recordShopierOrder } from "./purchases";
import { syncAllCoursesFromShopier, syncCourseFromShopier } from "./course-sync";

/** Grants purchases made with the student's verified email. Call only with a verified session. */
export function claimPendingPurchases(userId: string, verifiedEmail: string) {
  return claimPurchasesByEmail(getDatabase(), userId, verifiedEmail);
}

/** Looks the order up at Shopier; never trusts order details sent by the browser. */
export async function claimOrderForStudent(orderNumber: string, shopierEmail: string, userId: string) {
  const order = await getShopier().getOrder(orderNumber.trim());
  return claimShopierOrder(getDatabase(), order, shopierEmail, userId);
}

/** Backfills orders a webhook may have missed. Idempotent. */
export async function syncRecentShopierOrders(days = 7) {
  const orders = await getShopier().listOrdersSince(new Date(Date.now() - days * 86_400_000));
  const db = getDatabase();
  let purchases = 0, granted = 0;
  for (const order of orders) {
    const result = await recordShopierOrder(db, order);
    purchases += result.purchaseIds.length;
    granted += result.granted;
  }
  return { orders: orders.length, purchases, granted, courses: await syncAllCoursesFromShopier(db) };
}

/** Owner action: refresh one course's title, description, image and price from Shopier. */
export function refreshCourseFromShopier(courseId: string) {
  return syncCourseFromShopier(getDatabase(), courseId);
}

/** Five order-claim attempts per student per hour, stored in the shared rate-limit table. */
export async function consumeClaimAttempt(userId: string) {
  const key = `shopier-claim:${userId}`;
  const now = Date.now();
  const [row] = await getDatabase().insert(rateLimit).values({ id: key, key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} < ${now - 3_600_000} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} < ${now - 3_600_000} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    }).returning({ count: rateLimit.count });
  return row.count <= 5;
}
