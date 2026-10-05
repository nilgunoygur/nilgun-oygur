import { and, asc, desc, eq, isNull, ilike, or, count } from "drizzle-orm";
import { courseAccess, courses, refundRequests, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { hasFullRefund } from "./course-access.ts";

import { createEmailOutbox } from "../email/outbox.ts";
import { refundRequestEmail } from "../email/templates.tsx";
import { formatMoney } from "./format.ts";

export type RefundNotification = { encryptionKey: string; siteUrl: string };

// A student asks, the owner decides (owner-commands.ts); money only moves through Shopier.

type RefundRequestOutcome = "requested" | "no_purchase" | "already_pending" | "refunded";

/** A request is about the purchase behind the student's current access to the course. */
export async function requestRefund(db: Database, userId: string, courseId: string, reason: string, notification?: RefundNotification): Promise<RefundRequestOutcome> {
  const [purchase] = await db.select({ id: shopierPurchases.id, orderId: shopierPurchases.shopierOrderId }).from(courseAccess)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, courseAccess.sourcePurchaseId))
    .where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt))).limit(1);
  if (!purchase) return "no_purchase";
  if (await hasFullRefund(db, purchase.orderId)) return "refunded";
  return db.transaction(async tx => {
    const [inserted] = await tx.insert(refundRequests).values({ purchaseId: purchase.id, userId, reason }).onConflictDoNothing().returning({ id: refundRequests.id });
    if (!inserted) return "already_pending";
    if (notification) {
      const [details] = await tx.select({ name: user.name, email: user.email, course: courses.slug, amount: shopierPurchases.amountKurus, currency: shopierPurchases.currency }).from(shopierPurchases)
        .innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, userId)).where(eq(shopierPurchases.id, purchase.id));
      await createEmailOutbox(tx, notification.encryptionKey).enqueue(await refundRequestEmail({ requestId: inserted.id, ...details, orderId: purchase.orderId, amount: formatMoney(details.amount, details.currency), reason, siteUrl: notification.siteUrl.replace(/\/$/, "") }));
    }
    return "requested";
  });
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


export type RefundListInput = { status?: "pending" | "approved" | "declined"; search?: string; page?: number };
/** The owner sees both the decision history and pending work, with bounded database pagination. */
export async function listRefundRequests(db: Database, { status, search = "", page = 1 }: RefundListInput = {}) {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(status ? eq(refundRequests.status, status) : undefined, search ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(shopierPurchases.shopierOrderId, pattern), ilike(courses.slug, pattern)) : undefined);
  const base = () => db.select({ id: refundRequests.id, orderId: shopierPurchases.shopierOrderId, courseId: courses.id, productId: courses.shopierProductId, course: courses.slug, name: user.name, email: user.email,
    reason: refundRequests.reason, amountKurus: shopierPurchases.amountKurus, currency: shopierPurchases.currency, at: refundRequests.createdAt, status: refundRequests.status,
    refundAmountKurus: refundRequests.amountKurus, ownerNote: refundRequests.ownerNote, decidedAt: refundRequests.decidedAt, shopierRefundId: refundRequests.shopierRefundId, completed: shopierRefunds.id,
  }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).leftJoin(shopierRefunds, eq(shopierRefunds.id, refundRequests.shopierRefundId));
  const [items, [total], counts] = await Promise.all([
    base().where(where).orderBy(desc(refundRequests.createdAt), desc(refundRequests.id)).limit(20).offset((page - 1) * 20),
    db.select({ value: count() }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).where(where),
    db.select({ status: refundRequests.status, value: count() }).from(refundRequests).groupBy(refundRequests.status),
  ]);
  return { items: items.map(item => ({ ...item, at: item.at.toISOString(), decidedAt: item.decidedAt?.toISOString() ?? null, completed: Boolean(item.completed) })), total: total.value, counts: Object.fromEntries(counts.map(row => [row.status, row.value])) };
}
