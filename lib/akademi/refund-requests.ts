import { and, asc, desc, eq, isNull, ilike, or, count } from "drizzle-orm";
import { courseAccess, courses, refundRequests, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { hasFullRefund } from "./course-access.ts";
import { refundPageSize, type RefundListParams, type RefundStatus } from "./owner-forms.ts";
import { createEmailOutbox } from "../email/outbox.ts";
import { refundRequestEmail } from "../email/templates.tsx";
import { formatMoney } from "./format.ts";

export type RefundNotification = { encryptionKey: string; siteUrl: string };

type RefundRequestOutcome = "requested" | "no_purchase" | "already_pending" | "refunded";

/** A request is about the purchase behind the student's current access to the course. */
export async function requestRefund(db: Database, userId: string, courseId: string, reason: string, notification?: RefundNotification): Promise<RefundRequestOutcome> {
  const [purchase] = await db.select({ id: shopierPurchases.id, orderId: shopierPurchases.shopierOrderId }).from(courseAccess)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, courseAccess.sourcePurchaseId))
    .where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt))).limit(1);
  if (!purchase) return "no_purchase";
  if (await hasFullRefund(db, purchase.orderId)) return "refunded";
  return db.transaction(async tx => {
    // Row lock: a repeat submission cannot race an owner approval.
    const existing = await tx.select({ status: refundRequests.status }).from(refundRequests).where(and(eq(refundRequests.purchaseId, purchase.id), or(eq(refundRequests.status, "pending"), eq(refundRequests.status, "approved")))).for("update");
    if (existing.some(row => row.status === "approved")) return "refunded";
    if (existing.some(row => row.status === "pending")) return "already_pending";
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
  const [current] = await db.select({ purchaseId: courseAccess.sourcePurchaseId }).from(courseAccess).where(and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt))).limit(1);
  if (current && !current.purchaseId) return null;
  const [request] = await db.select({ status: refundRequests.status, ownerNote: refundRequests.ownerNote }).from(refundRequests)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId))
    .where(and(eq(refundRequests.userId, userId), eq(shopierPurchases.courseId, courseId), current?.purchaseId ? eq(refundRequests.purchaseId, current.purchaseId) : undefined)).orderBy(desc(refundRequests.createdAt)).limit(1);
  return request ?? null;
}

export function studentRefundRequests(db: Database, userId: string) {
  return db.select({ id: refundRequests.id, courseId: courses.id, productId: courses.shopierProductId, orderId: shopierPurchases.shopierOrderId, status: refundRequests.status, ownerNote: refundRequests.ownerNote })
    .from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId))
    .where(eq(refundRequests.userId, userId)).orderBy(desc(refundRequests.createdAt), desc(refundRequests.id)).limit(10);
}

export function pendingRefundRequests(db: Database) {
  return db.select({ id: refundRequests.id, orderId: shopierPurchases.shopierOrderId, courseId: shopierPurchases.courseId, name: user.name, email: user.email,
    reason: refundRequests.reason, amountKurus: shopierPurchases.amountKurus, currency: shopierPurchases.currency, at: refundRequests.createdAt,
  }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(user, eq(user.id, refundRequests.userId))
    .where(eq(refundRequests.status, "pending")).orderBy(asc(refundRequests.createdAt)).limit(50);
}

export async function listRefundRequests(db: Database, { status = "all", search = "", page = 1 }: Partial<RefundListParams> = {}) {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(status !== "all" ? eq(refundRequests.status, status) : undefined, search ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(shopierPurchases.shopierOrderId, pattern), ilike(courses.slug, pattern)) : undefined);
  const [items, [total], counts] = await Promise.all([
    db.select({ id: refundRequests.id, orderId: shopierPurchases.shopierOrderId, courseId: courses.id, productId: courses.shopierProductId, course: courses.slug, name: user.name, email: user.email,
      reason: refundRequests.reason, amountKurus: shopierPurchases.amountKurus, currency: shopierPurchases.currency, at: refundRequests.createdAt, status: refundRequests.status,
      refundAmountKurus: refundRequests.amountKurus, ownerNote: refundRequests.ownerNote, decidedAt: refundRequests.decidedAt, shopierRefundId: refundRequests.shopierRefundId, completed: shopierRefunds.id,
    }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).leftJoin(shopierRefunds, eq(shopierRefunds.id, refundRequests.shopierRefundId))
      .where(where).orderBy(desc(refundRequests.createdAt), desc(refundRequests.id)).limit(refundPageSize).offset((page - 1) * refundPageSize),
    db.select({ value: count() }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).where(where),
    db.select({ status: refundRequests.status, value: count() }).from(refundRequests).groupBy(refundRequests.status),
  ]);
  return { items: items.map(item => ({ ...item, at: item.at.toISOString(), decidedAt: item.decidedAt?.toISOString() ?? null, completed: Boolean(item.completed) })),
    total: total.value, pages: Math.max(1, Math.ceil(total.value / refundPageSize)),
    counts: { pending: 0, approved: 0, declined: 0, ...Object.fromEntries(counts.map(row => [row.status, row.value])) } as Record<RefundStatus, number> };
}
