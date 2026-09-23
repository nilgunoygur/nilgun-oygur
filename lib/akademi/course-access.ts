import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { courseAccess, courses, shopierPurchases, user } from "../db/schema.ts";
import { buyerEmail, toKurus, type ShopierOrder } from "../shopier/api.ts";
import { accessExpiryFromPayment, hasActiveAccess, type AccessGrant } from "./access-policy.ts";
import type { Database } from "../db/types.ts";

// Course Access: the only module that grants course access or answers "can this student use this course now?".
// Callers pass IDs from a verified session or a verified provider event, never from the browser.

type RecordResult = { purchaseIds: string[]; granted: number; reason?: "unpaid" | "no_course" | "no_email" };

// Idempotent: stores a paid order's course lines once and grants them to the verified buyer-email account.
export async function recordShopierOrder(db: Database, order: ShopierOrder): Promise<RecordResult> {
  if (order.paymentStatus !== "paid") return { purchaseIds: [], granted: 0, reason: "unpaid" };
  const productIds = [...new Set(order.lineItems.map(item => item.productId))];
  // Any linked course, whatever its status: archiving stops new sales but never refuses a verified payment.
  const matched = await db.select({ id: courses.id, productId: courses.shopierProductId, days: courses.accessDurationDays })
    .from(courses).where(inArray(courses.shopierProductId, productIds));
  if (matched.length === 0) return { purchaseIds: [], granted: 0, reason: "no_course" };
  const email = buyerEmail(order);
  if (!email) return { purchaseIds: [], granted: 0, reason: "no_email" };
  await db.insert(shopierPurchases).values(matched.map(course => ({
    shopierOrderId: order.id,
    courseId: course.id,
    buyerEmail: email,
    amountKurus: order.lineItems.filter(item => item.productId === course.productId).reduce((sum, item) => sum + toKurus(item.total), 0),
    currency: order.currency,
    accessDurationDays: course.days,
    purchasedAt: order.dateCreated,
  }))).onConflictDoNothing({ target: [shopierPurchases.shopierOrderId, shopierPurchases.courseId] });
  const purchases = await db.select({ id: shopierPurchases.id }).from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, order.id));
  const [student] = await db.select({ id: user.id }).from(user).where(and(sql`lower(${user.email}) = ${email}`, eq(user.emailVerified, true))).limit(1);
  let granted = 0;
  if (student) for (const purchase of purchases) if (await claimPurchase(db, purchase.id, student.id)) granted++;
  return { purchaseIds: purchases.map(p => p.id), granted };
}

// Claims an unclaimed purchase and grants access in one transaction; active access is extended.
export async function claimPurchase(db: Database, purchaseId: string, userId: string, now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Lock the student, then re-read the purchase under lock.
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
        expiresAt = accessExpiryFromPayment(current.expiresAt, purchase.accessDurationDays);
      }
      await tx.update(courseAccess).set({ revokedAt: now, revocationReason: stillActive ? "extended_by_purchase" : "expired_replaced" })
        .where(eq(courseAccess.id, current.id));
    }
    await tx.insert(courseAccess).values({ userId, courseId: purchase.courseId, sourcePurchaseId: purchase.id, startsAt, expiresAt });
    return true;
  });
}

/** Grants every unclaimed purchase made with this verified email. Runs when the email is verified and on sign-in. */
export async function claimPurchasesByEmail(db: Database, userId: string, email: string): Promise<number> {
  const pending = await db.select({ id: shopierPurchases.id }).from(shopierPurchases)
    .where(and(isNull(shopierPurchases.userId), eq(shopierPurchases.buyerEmail, email.trim().toLowerCase())));
  let granted = 0;
  for (const purchase of pending) if (await claimPurchase(db, purchase.id, userId)) granted++;
  return granted;
}

export type ClaimOutcome = "granted" | "already_yours" | "claimed_by_other" | "not_found" | "unpaid" | "not_academy";

// Claims a Shopier-fetched order (never browser data) whose buyer email matches the typed one.
export async function claimShopierOrder(db: Database, order: ShopierOrder | null, typedEmail: string, userId: string): Promise<ClaimOutcome> {
  if (!order || buyerEmail(order) !== typedEmail.trim().toLowerCase()) return "not_found";
  if (order.paymentStatus !== "paid") return "unpaid";
  const { purchaseIds } = await recordShopierOrder(db, order);
  if (purchaseIds.length === 0) return "not_academy";
  let granted = 0;
  for (const id of purchaseIds) if (await claimPurchase(db, id, userId)) granted++;
  if (granted > 0) return "granted";
  const owners = await db.select({ userId: shopierPurchases.userId }).from(shopierPurchases).where(inArray(shopierPurchases.id, purchaseIds));
  return owners.every(p => p.userId === userId) ? "already_yours" : "claimed_by_other";
}

export type ActiveAccess = AccessGrant & { id: string; shopierProductId: string };

/** The student's grants that are usable right now, soonest expiry first. */
export async function activeCourseAccess(db: Database, userId: string, now = new Date()): Promise<ActiveAccess[]> {
  const grants = await db.select({
    id: courseAccess.id, userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt,
    expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt, shopierProductId: courses.shopierProductId,
  }).from(courseAccess).innerJoin(courses, eq(courses.id, courseAccess.courseId))
    .where(and(eq(courseAccess.userId, userId), isNull(courseAccess.revokedAt))).orderBy(asc(courseAccess.expiresAt));
  return grants.filter(grant => hasActiveAccess(grant, userId, grant.courseId, now));
}

/** The grant that lets this student use this course now, or null. Playback tokens and live join links start here. */
export async function activeGrant(db: Database, userId: string, courseId: string, now = new Date()): Promise<AccessGrant | null> {
  const [grant] = await db.select({
    userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt, expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt,
  }).from(courseAccess).where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt))).limit(1);
  return grant && hasActiveAccess(grant, userId, courseId, now) ? grant : null;
}
