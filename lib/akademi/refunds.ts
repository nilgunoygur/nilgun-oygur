import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { courseAccess, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import { toKurus, type ShopierRefund } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";
import { purchaseWindow } from "./access-policy.ts";

/** Refunds and claims of one order run one at a time. */
export const lockShopierOrder = (tx: Database, orderId: string) => tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`);

export async function hasFullRefund(db: Database, orderId: string) {
  const [refund] = await db.select({ id: shopierRefunds.id }).from(shopierRefunds).where(and(eq(shopierRefunds.shopierOrderId, orderId), eq(shopierRefunds.type, "full"))).limit(1);
  return !!refund;
}

/** Only succeeded refunds change access. */
export async function recordShopierRefund(db: Database, refund: ShopierRefund) {
  if (refund.status !== "succeeded") return "refund_pending_or_failed";
  return db.transaction(async tx => {
    await lockShopierOrder(tx, refund.orderId);
    const inserted = await tx.insert(shopierRefunds).values({ id: refund.id, shopierOrderId: refund.orderId, type: refund.type,
      amountKurus: toKurus(refund.total), currency: refund.currency, refundedAt: refund.dateRefunded ?? refund.dateCreated,
    }).onConflictDoNothing().returning({ id: shopierRefunds.id });
    if (!inserted.length) return "refund_duplicate";
    // A partial refund names an order, not a product. Keep it visible for owner review.
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

/** A recorded refund is never applied twice, so the daily replay skips the ones already stored. */
export async function recordNewShopierRefunds(db: Database, refunds: ShopierRefund[]) {
  if (!refunds.length) return;
  const known = new Set((await db.select({ id: shopierRefunds.id }).from(shopierRefunds).where(inArray(shopierRefunds.id, refunds.map(r => r.id)))).map(r => r.id));
  for (const refund of refunds) if (!known.has(refund.id)) await recordShopierRefund(db, refund);
}

// Rebuilds only the current extension chain; owner grants and manual revocations are untouched.
async function rebuildRefundedExtension(db: Database, userId: string, courseId: string, orderId: string) {
  const grants = await db.select().from(courseAccess).where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId)));
  const current = grants.find(g => g.revokedAt === null);
  if (!current || !current.sourcePurchaseId) return;
  const purchases = await db.select().from(shopierPurchases).where(and(eq(shopierPurchases.userId, userId), eq(shopierPurchases.courseId, courseId)));
  const byPurchase = new Map(purchases.map(p => [p.id, p]));
  const byGrant = new Map(grants.map(g => [g.id, g]));
  const chain: typeof grants = [];
  const visited = new Set<string>();
  for (let grant: typeof current | undefined = current; grant; grant = grant.extendedFromId ? byGrant.get(grant.extendedFromId) : undefined) {
    if (visited.has(grant.id)) throw new Error("Invalid course access extension chain.");
    visited.add(grant.id);
    chain.unshift(grant);
  }
  if (!chain.some(g => g.sourcePurchaseId && byPurchase.get(g.sourcePurchaseId)?.shopierOrderId === orderId)) return;
  const refunds = await db.select().from(shopierRefunds).where(and(eq(shopierRefunds.type, "full"), inArray(shopierRefunds.shopierOrderId, purchases.map(p => p.shopierOrderId))));
  const refundedOrders = new Set(refunds.map(r => r.shopierOrderId));
  let remaining: { grant: typeof current; startsAt: Date; expiresAt: Date } | undefined;
  for (const grant of chain) {
    if (!grant.sourcePurchaseId) { remaining = { grant, startsAt: grant.startsAt, expiresAt: grant.expiresAt }; continue; }
    const purchase = byPurchase.get(grant.sourcePurchaseId);
    if (!purchase) throw new Error("Course access purchase is missing.");
    if (refundedOrders.has(purchase.shopierOrderId)) continue;
    const { startsAt, expiresAt } = purchaseWindow(remaining, purchase.purchasedAt, purchase.accessDurationDays);
    remaining = { grant, startsAt, expiresAt };
  }
  // Release the unique active slot before restoring a surviving earlier purchase.
  await db.update(courseAccess).set({ revokedAt: new Date(), revocationReason: "shopier_full_refund" }).where(eq(courseAccess.id, current.id));
  if (remaining) await db.update(courseAccess).set({ startsAt: remaining.startsAt, expiresAt: remaining.expiresAt, revokedAt: null, revocationReason: null }).where(eq(courseAccess.id, remaining.grant.id));
}

export function partialRefundReviews(db: Database) {
  return db.select({ id: shopierRefunds.id, orderId: shopierRefunds.shopierOrderId, amountKurus: shopierRefunds.amountKurus,
    currency: shopierRefunds.currency, at: shopierRefunds.refundedAt }).from(shopierRefunds)
    .where(eq(shopierRefunds.type, "partial")).orderBy(asc(shopierRefunds.refundedAt)).limit(20);
}
