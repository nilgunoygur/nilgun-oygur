import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { courseAccess, courses, shopierPurchases, user } from "../db/schema.ts";
import type * as schema from "../db/schema.ts";
import { buyerEmail, toKurus, type ShopierOrder } from "../shopier/api.ts";
import { accessExpiryFromPayment } from "./access-policy.ts";

// Internal service; server entry points live in lib/akademi/server.ts.
type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
const DAY = 86_400_000;

export type RecordResult = { purchaseIds: string[]; granted: number; reason?: "unpaid" | "no_course" | "no_email" };

/**
 * Stores each academy course line of a paid Shopier order exactly once, then grants it
 * to the student whose verified account email matches the buyer email, if one exists.
 * Safe to call repeatedly for the same order (webhook retries, daily sync, claims).
 */
export async function recordShopierOrder(db: Database, order: ShopierOrder): Promise<RecordResult> {
  if (order.paymentStatus !== "paid") return { purchaseIds: [], granted: 0, reason: "unpaid" };
  const productIds = [...new Set(order.lineItems.map(item => item.productId))];
  const matched = await db.select({ id: courses.id, productId: courses.shopierProductId, days: courses.accessDurationDays })
    .from(courses).where(inArray(courses.shopierProductId, productIds));
  if (matched.length === 0) return { purchaseIds: [], granted: 0, reason: "no_course" };
  const email = buyerEmail(order);
  if (!email) return { purchaseIds: [], granted: 0, reason: "no_email" };
  for (const course of matched) {
    const lines = order.lineItems.filter(item => item.productId === course.productId);
    await db.insert(shopierPurchases).values({
      shopierOrderId: order.id,
      courseId: course.id,
      buyerEmail: email,
      amountKurus: lines.reduce((sum, item) => sum + toKurus(item.total), 0),
      currency: order.currency,
      accessDurationDays: course.days,
      purchasedAt: order.dateCreated,
    }).onConflictDoNothing({ target: [shopierPurchases.shopierOrderId, shopierPurchases.courseId] });
  }
  const purchases = await db.select({ id: shopierPurchases.id }).from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, order.id));
  const [student] = await db.select({ id: user.id }).from(user).where(and(sql`lower(${user.email}) = ${email}`, eq(user.emailVerified, true))).limit(1);
  let granted = 0;
  if (student) for (const purchase of purchases) if (await claimPurchase(db, purchase.id, student.id)) granted++;
  return { purchaseIds: purchases.map(p => p.id), granted };
}

/**
 * Assigns an unclaimed purchase to a student and grants access in one transaction.
 * Access runs from the payment time; a purchase made while access is still active extends it.
 * Returns false when the purchase already belongs to someone (including this student).
 */
export async function claimPurchase(db: Database, purchaseId: string, userId: string, now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Serialize every grant change for this student, then re-read the purchase under lock.
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const [purchase] = await tx.select().from(shopierPurchases).where(eq(shopierPurchases.id, purchaseId)).for("update");
    if (!purchase || purchase.userId !== null) return false;
    await tx.update(shopierPurchases).set({ userId, claimedAt: now }).where(eq(shopierPurchases.id, purchase.id));
    const [current] = await tx.select().from(courseAccess)
      .where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, purchase.courseId), isNull(courseAccess.revokedAt)));
    let startsAt = purchase.purchasedAt;
    let expiresAt = accessExpiryFromPayment(purchase.purchasedAt, purchase.accessDurationDays);
    if (current) {
      const stillActive = current.expiresAt.getTime() > purchase.purchasedAt.getTime();
      if (stillActive) {
        startsAt = current.startsAt;
        expiresAt = new Date(current.expiresAt.getTime() + purchase.accessDurationDays * DAY);
      }
      await tx.update(courseAccess).set({ revokedAt: now, revocationReason: stillActive ? "extended_by_purchase" : "expired_replaced" })
        .where(eq(courseAccess.id, current.id));
    }
    await tx.insert(courseAccess).values({ userId, courseId: purchase.courseId, sourcePurchaseId: purchase.id, startsAt, expiresAt });
    return true;
  });
}

/** Grants every unclaimed purchase made with this verified email. */
export async function claimPurchasesByEmail(db: Database, userId: string, email: string): Promise<number> {
  const pending = await db.select({ id: shopierPurchases.id }).from(shopierPurchases)
    .where(and(isNull(shopierPurchases.userId), eq(shopierPurchases.buyerEmail, email.trim().toLowerCase())));
  let granted = 0;
  for (const purchase of pending) if (await claimPurchase(db, purchase.id, userId)) granted++;
  return granted;
}

export type ClaimOutcome = "granted" | "already_yours" | "claimed_by_other" | "not_found" | "not_academy";

/**
 * Claims an order bought with a different email. The order must exist at Shopier (fetched
 * by the caller, never trusted from the browser) and the typed email must match the order.
 */
export async function claimShopierOrder(db: Database, order: ShopierOrder | null, typedEmail: string, userId: string): Promise<ClaimOutcome> {
  if (!order || order.paymentStatus !== "paid" || buyerEmail(order) !== typedEmail.trim().toLowerCase()) return "not_found";
  const { purchaseIds } = await recordShopierOrder(db, order);
  if (purchaseIds.length === 0) return "not_academy";
  let granted = 0;
  for (const id of purchaseIds) if (await claimPurchase(db, id, userId)) granted++;
  if (granted > 0) return "granted";
  const owners = await db.select({ userId: shopierPurchases.userId }).from(shopierPurchases).where(inArray(shopierPurchases.id, purchaseIds));
  return owners.every(p => p.userId === userId) ? "already_yours" : "claimed_by_other";
}
