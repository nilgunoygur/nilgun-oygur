import { asc, eq, inArray, sql } from "drizzle-orm";
import { shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import { refundedAt, toKurus, type ShopierRefund } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";
import { lockShopierOrder, rebuildRefundedExtension } from "./course-access.ts";

export async function recordShopierRefund(db: Database, refund: ShopierRefund) {
  if (refund.status !== "succeeded") return "refund_pending_or_failed";
  return db.transaction(async tx => {
    await lockShopierOrder(tx, refund.orderId);
    const inserted = await tx.insert(shopierRefunds).values({ id: refund.id, shopierOrderId: refund.orderId, type: refund.type,
      amountKurus: toKurus(refund.total), currency: refund.currency, refundedAt: refundedAt(refund),
    }).onConflictDoNothing().returning({ id: shopierRefunds.id });
    if (!inserted.length) return "refund_duplicate";
    // Partial refunds name no product; kept for owner review.
    if (refund.type !== "full") return "partial_refund_review";
    const purchases = await tx.select().from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, refund.orderId));
    const students = [...new Set(purchases.flatMap(p => p.userId ? [p.userId] : []))].sort();
    for (const student of students) {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, student)).for("update");
      for (const courseId of new Set(purchases.filter(p => p.userId === student).map(p => p.courseId))) {
        await rebuildRefundedExtension(tx, student, courseId, refund.orderId);
      }
    }
    return "refunded";
  });
}

/** Skips stored refunds without opening a transaction for each. */
export async function recordNewShopierRefunds(db: Database, refunds: ShopierRefund[]) {
  if (!refunds.length) return;
  const known = new Set((await db.select({ id: shopierRefunds.id }).from(shopierRefunds).where(inArray(shopierRefunds.id, refunds.map(r => r.id)))).map(r => r.id));
  for (const refund of refunds) if (!known.has(refund.id)) await recordShopierRefund(db, refund);
}

/** What an order's course purchases cost, less the refunds recorded for it. */
export async function refundableKurus(db: Database, orderId: string) {
  const [[{ paid }], [{ refunded }]] = await Promise.all([
    db.select({ paid: sql<number>`coalesce(sum(${shopierPurchases.amountKurus}), 0)::int` }).from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, orderId)),
    db.select({ refunded: sql<number>`coalesce(sum(${shopierRefunds.amountKurus}), 0)::int` }).from(shopierRefunds).where(eq(shopierRefunds.shopierOrderId, orderId)),
  ]);
  return paid - refunded;
}

export function partialRefundReviews(db: Database) {
  return db.select({ id: shopierRefunds.id, orderId: shopierRefunds.shopierOrderId, amountKurus: shopierRefunds.amountKurus,
    currency: shopierRefunds.currency, at: shopierRefunds.refundedAt }).from(shopierRefunds)
    .where(eq(shopierRefunds.type, "partial")).orderBy(asc(shopierRefunds.refundedAt)).limit(20);
}
