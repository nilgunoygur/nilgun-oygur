import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { courseAccess, courses, lessonProgress, lessons, refundRequests, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import { buyerEmail, productTotalKurus, type ShopierOrder } from "../shopier/api.ts";
import { hasActiveAccess, purchaseWindow, type AccessGrant } from "./access-policy.ts";
import { adoptShopierContact } from "./student-contact.ts";
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
    amountKurus: productTotalKurus(order, course.productId),
    currency: order.currency,
    accessDurationDays: course.days,
    purchasedAt: order.dateCreated,
  }))).onConflictDoNothing({ target: [shopierPurchases.shopierOrderId, shopierPurchases.courseId] });
  const purchases = await db.select({ id: shopierPurchases.id }).from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, order.id));
  const [student] = await db.select({ id: user.id }).from(user).where(and(sql`lower(${user.email}) = ${email}`, eq(user.emailVerified, true))).limit(1);
  let granted = 0;
  if (student) {
    for (const purchase of purchases) if (await claimPurchase(db, purchase.id, student.id)) granted++;
    await adoptContactSafely(db, student.id, order);
  }
  return { purchaseIds: purchases.map(p => p.id), granted };
}

// Contact is a convenience: it must never block or retry a paid grant.
async function adoptContactSafely(db: Database, userId: string, order: ShopierOrder) {
  try { await adoptShopierContact(db, userId, order); } catch { console.error("Shopier contact could not be copied to the student profile."); }
}

/** A refunded course starts over if it is bought again. */
const forgetProgress = (tx: Database, userId: string, courseId: string) => tx.delete(lessonProgress).where(and(eq(lessonProgress.userId, userId),
  inArray(lessonProgress.lessonId, tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId)))));

/** Refunds and claims of one order run one at a time. */
export const lockShopierOrder = (tx: Database, orderId: string) => tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`);

export async function hasFullRefund(db: Database, orderId: string) {
  const [refund] = await db.select({ id: shopierRefunds.id }).from(shopierRefunds).where(and(eq(shopierRefunds.shopierOrderId, orderId), eq(shopierRefunds.type, "full"))).limit(1);
  return !!refund;
}

// Claims an unclaimed purchase and grants access in one transaction; active access is extended.
export async function claimPurchase(db: Database, purchaseId: string, userId: string, now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [candidate] = await tx.select().from(shopierPurchases).where(eq(shopierPurchases.id, purchaseId));
    if (!candidate) return false;
    // Order lock (shared with refunds), then the student, then re-read the purchase.
    await lockShopierOrder(tx, candidate.shopierOrderId);
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const [purchase] = await tx.select().from(shopierPurchases).where(eq(shopierPurchases.id, purchaseId)).for("update");
    if (!purchase || purchase.userId !== null) return false;
    if (await hasFullRefund(tx, purchase.shopierOrderId)) return false;
    await tx.update(shopierPurchases).set({ userId, claimedAt: now }).where(eq(shopierPurchases.id, purchase.id));
    const [current] = await tx.select().from(courseAccess)
      .where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, purchase.courseId), isNull(courseAccess.revokedAt)));
    const [approved] = current?.sourcePurchaseId ? await tx.select({ id: refundRequests.id }).from(refundRequests).where(and(eq(refundRequests.purchaseId, current.sourcePurchaseId), eq(refundRequests.status, "approved"))).limit(1) : [];
    const { extendsPrevious, startsAt, expiresAt } = purchaseWindow(approved ? null : current, purchase.purchasedAt, purchase.accessDurationDays);
    // An approved request may refund only part of the payment, which revokes nothing: the progress is dropped here.
    if (approved) await forgetProgress(tx, userId, purchase.courseId);
    if (current) {
      await tx.update(courseAccess).set({ revokedAt: now, revocationReason: extendsPrevious ? "extended_by_purchase" : "expired_replaced" })
        .where(eq(courseAccess.id, current.id));
    }
    await tx.insert(courseAccess).values({ userId, courseId: purchase.courseId, sourcePurchaseId: purchase.id, startsAt, expiresAt,
      extendedFromId: extendsPrevious && current ? current.id : null });
    return true;
  });
}

// Rebuilds only the current extension chain; owner grants and manual revocations are untouched.
export async function rebuildRefundedExtension(db: Database, userId: string, courseId: string, orderId: string) {
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
  else await forgetProgress(db, userId, courseId);
}

/** Grants every unclaimed purchase made with this verified email. Runs when the email is verified and on sign-in. */
export async function claimPurchasesByEmail(db: Database, userId: string, email: string): Promise<number> {
  const pending = await db.select({ id: shopierPurchases.id }).from(shopierPurchases)
    .where(and(isNull(shopierPurchases.userId), eq(shopierPurchases.buyerEmail, email.trim().toLowerCase())));
  let granted = 0;
  for (const purchase of pending) if (await claimPurchase(db, purchase.id, userId)) granted++;
  return granted;
}

export type ClaimOutcome = "granted" | "already_yours" | "claimed_by_other" | "not_found" | "unpaid" | "not_academy" | "refunded";

// Claims a Shopier-fetched order (never browser data) whose buyer email matches the typed one.
export async function claimShopierOrder(db: Database, order: ShopierOrder | null, typedEmail: string, userId: string): Promise<ClaimOutcome> {
  if (!order || buyerEmail(order) !== typedEmail.trim().toLowerCase()) return "not_found";
  if (order.paymentStatus !== "paid") return "unpaid";
  const { purchaseIds } = await recordShopierOrder(db, order);
  if (purchaseIds.length === 0) return "not_academy";
  if (await hasFullRefund(db, order.id)) return "refunded";
  let granted = 0;
  for (const id of purchaseIds) if (await claimPurchase(db, id, userId)) granted++;
  let outcome: ClaimOutcome = "granted";
  if (!granted) {
    const owners = await db.select({ userId: shopierPurchases.userId }).from(shopierPurchases).where(inArray(shopierPurchases.id, purchaseIds));
    outcome = owners.every(p => p.userId === userId) ? "already_yours" : "claimed_by_other";
  }
  if (outcome !== "claimed_by_other") await adoptContactSafely(db, userId, order);
  return outcome;
}

const refundForGrant = (...statuses: ("pending" | "approved")[]) => sql<boolean>`exists (select 1 from ${refundRequests} where ${refundRequests.purchaseId} = ${courseAccess.sourcePurchaseId} and ${inArray(refundRequests.status, statuses)})`;
export type ActiveAccess = AccessGrant & { id: string; shopierProductId: string; refundPending: boolean };

/** Unexpired grants, soonest expiry first; approved refunds are omitted. */
export async function activeCourseAccess(db: Database, userId: string, now = new Date()): Promise<ActiveAccess[]> {
  const grants = await db.select({
    id: courseAccess.id, userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt,
    expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt, shopierProductId: courses.shopierProductId, refundPending: refundForGrant("pending"),
  }).from(courseAccess).innerJoin(courses, eq(courses.id, courseAccess.courseId))
    .where(and(eq(courseAccess.userId, userId), isNull(courseAccess.revokedAt), sql`not ${refundForGrant("approved")}`)).orderBy(asc(courseAccess.expiresAt));
  return grants.filter(grant => hasActiveAccess(grant, userId, grant.courseId, now));
}

/** The grant that lets this student use this course now, or null. Playback tokens and live join links start here. */
export async function activeGrant(db: Database, userId: string, courseId: string, now = new Date()): Promise<AccessGrant | null> {
  const [grant] = await db.select({
    userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt, expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt,
  }).from(courseAccess).where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt), sql`not ${refundForGrant("pending", "approved")}`)).limit(1);
  return grant && hasActiveAccess(grant, userId, courseId, now) ? grant : null;
}
