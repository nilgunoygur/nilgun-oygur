import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { courseAccess, refundRequests, shopierPurchases, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { hasFullRefund } from "./course-access.ts";

// A student asks, the owner decides (owner-commands.ts); money only moves through Shopier.

type RefundRequestOutcome = "requested" | "no_purchase" | "already_pending" | "refunded";

/** A request is about the purchase behind the student's current access to the course. */
export async function requestRefund(db: Database, userId: string, courseId: string, reason: string): Promise<RefundRequestOutcome> {
  const [purchase] = await db.select({ id: shopierPurchases.id, orderId: shopierPurchases.shopierOrderId }).from(courseAccess)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, courseAccess.sourcePurchaseId))
    .where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt))).limit(1);
  if (!purchase) return "no_purchase";
  if (await hasFullRefund(db, purchase.orderId)) return "refunded";
  const inserted = await db.insert(refundRequests).values({ purchaseId: purchase.id, userId, reason }).onConflictDoNothing().returning({ id: refundRequests.id });
  return inserted.length ? "requested" : "already_pending";
}

export async function latestRefundRequest(db: Database, userId: string, courseId: string) {
  const [request] = await db.select({ status: refundRequests.status, ownerNote: refundRequests.ownerNote }).from(refundRequests)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId))
    .where(and(eq(refundRequests.userId, userId), eq(shopierPurchases.courseId, courseId))).orderBy(desc(refundRequests.createdAt)).limit(1);
  return request ?? null;
}

export function pendingRefundRequests(db: Database) {
  return db.select({ id: refundRequests.id, orderId: shopierPurchases.shopierOrderId, courseId: shopierPurchases.courseId, name: user.name, email: user.email,
    reason: refundRequests.reason, amountKurus: shopierPurchases.amountKurus, currency: shopierPurchases.currency, at: refundRequests.createdAt,
  }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(user, eq(user.id, refundRequests.userId))
    .where(eq(refundRequests.status, "pending")).orderBy(asc(refundRequests.createdAt)).limit(50);
}
