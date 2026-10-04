import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { courseAccess, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import { toKurus, type ShopierRefund } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";
import { accessExpiryFromPayment } from "./access-policy.ts";

/** Only completed refunds change access. No buyer details or unrestricted payloads are stored. */
export async function recordShopierRefund(db: Database, refund: ShopierRefund) {
  if (refund.status !== "succeeded") return "refund_pending_or_failed";
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${refund.orderId}))`);
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

// Follow only the current extension chain. Independent owner grants and access
// manually revoked by the owner are never restored by a refund.
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
    const startsAt = remaining && remaining.expiresAt > purchase.purchasedAt ? remaining.startsAt : purchase.purchasedAt;
    const base = remaining && remaining.expiresAt > purchase.purchasedAt ? remaining.expiresAt : purchase.purchasedAt;
    remaining = { grant, startsAt, expiresAt: accessExpiryFromPayment(base, purchase.accessDurationDays) };
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
