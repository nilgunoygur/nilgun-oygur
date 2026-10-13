import { and, desc, eq, gt, inArray, isNull, ilike, or, count, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { courseAccess, courses, refundRequests, shopierPurchases, shopierRefunds, user } from "../db/schema.ts";
import { containsPattern } from "../db/search.ts";
import type { Database } from "../db/types.ts";
import { hasFullRefund, sameRefundUnit } from "./course-access.ts";
import { refundNoticeDays } from "./claim-schema.ts";
import { refundPageSize, type RefundListParams, type RefundStatus } from "./owner-forms.ts";
import { createEmailOutbox } from "../email/outbox.ts";
import { refundRequestEmail } from "../email/templates.tsx";
import { formatMoney } from "./format.ts";

export type RefundNotification = { encryptionKey: string; siteUrl: string };

type RefundRequestOutcome = "requested" | "no_purchase" | "already_pending" | "refunded";

const bundles = alias(courses, "bundles"), unit = alias(shopierPurchases, "unit"), held = alias(shopierPurchases, "held");
/** The ids of the purchases refunded together with this one. */
const refundUnit = (db: Database, purchaseId: string) => db.select({ id: unit.id }).from(unit).innerJoin(held, sameRefundUnit(unit, held)).where(eq(held.id, purchaseId));
const unitAmountKurus = sql<number>`(select sum(${unit.amountKurus}) from ${shopierPurchases} as ${unit} where ${sameRefundUnit(unit, shopierPurchases)})::int`;
/** The product the student paid for: the bundle when the course came in one. */
const soldProductId = sql<string>`coalesce(${bundles.shopierProductId}, ${courses.shopierProductId})`, soldSlug = sql<string>`coalesce(${bundles.slug}, ${courses.slug})`;
const currentAccess = (userId: string, courseId: string) => and(eq(courseAccess.userId, userId), eq(courseAccess.courseId, courseId), isNull(courseAccess.revokedAt));

/** One request per purchase, or per bundle order. */
export async function requestRefund(db: Database, userId: string, courseId: string, reason: string, notification?: RefundNotification): Promise<RefundRequestOutcome> {
  const [purchase] = await db.select({ id: shopierPurchases.id, orderId: shopierPurchases.shopierOrderId, amountKurus: unitAmountKurus, currency: shopierPurchases.currency,
    course: soldSlug, name: user.name, email: user.email }).from(courseAccess)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, courseAccess.sourcePurchaseId)).innerJoin(courses, eq(courses.id, courseAccess.courseId)).innerJoin(user, eq(user.id, courseAccess.userId))
    .leftJoin(bundles, eq(bundles.id, shopierPurchases.bundleId)).where(currentAccess(userId, courseId)).limit(1);
  if (!purchase) return "no_purchase";
  if (await hasFullRefund(db, purchase.orderId)) return "refunded";
  const id = crypto.randomUUID();
  // Rendered here so the transaction holds its row lock only for the writes.
  const email = notification && { key: notification.encryptionKey, message: await refundRequestEmail({ requestId: id, name: purchase.name, email: purchase.email, course: purchase.course, orderId: purchase.orderId,
    amount: formatMoney(purchase.amountKurus, purchase.currency), reason, siteUrl: notification.siteUrl.replace(/\/$/, "") }) };
  return db.transaction(async tx => {
    // Purchases locked first: no race with an approval or a sibling course's request.
    const purchases = await refundUnit(tx, purchase.id).for("update");
    const existing = await tx.select({ status: refundRequests.status }).from(refundRequests).where(and(inArray(refundRequests.purchaseId, purchases.map(item => item.id)), or(eq(refundRequests.status, "pending"), eq(refundRequests.status, "approved")))).for("update");
    if (existing.some(row => row.status === "approved")) return "refunded";
    if (existing.some(row => row.status === "pending")) return "already_pending";
    const [inserted] = await tx.insert(refundRequests).values({ id, purchaseId: purchase.id, userId, reason }).onConflictDoNothing().returning({ id: refundRequests.id });
    if (!inserted) return "already_pending";
    if (email) await createEmailOutbox(tx, email.key).enqueue(email.message);
    return "requested";
  });
}

/** The student's latest request about this course and, when it came in a bundle, that bundle's product. */
export async function refundState(db: Database, userId: string, courseId: string) {
  const [current] = await db.select({ purchaseId: courseAccess.sourcePurchaseId, bundleProductId: bundles.shopierProductId }).from(courseAccess)
    .leftJoin(shopierPurchases, eq(shopierPurchases.id, courseAccess.sourcePurchaseId)).leftJoin(bundles, eq(bundles.id, shopierPurchases.bundleId)).where(currentAccess(userId, courseId)).limit(1);
  const bundleProductId = current?.bundleProductId ?? null;
  // An owner grant has no purchase to refund.
  if (current && !current.purchaseId) return { request: null, bundleProductId };
  const [request] = await db.select({ status: refundRequests.status, ownerNote: refundRequests.ownerNote }).from(refundRequests)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId))
    .where(and(eq(refundRequests.userId, userId), current?.purchaseId ? inArray(refundRequests.purchaseId, refundUnit(db, current.purchaseId)) : eq(shopierPurchases.courseId, courseId))).orderBy(desc(refundRequests.createdAt)).limit(1);
  return { request: request ?? null, bundleProductId };
}

/** Pending requests, and decided ones for `refundNoticeDays` after the decision. */
export function studentRefundRequests(db: Database, userId: string, now: Date) {
  return db.select({ id: refundRequests.id, courseId: courses.id, productId: soldProductId, orderId: shopierPurchases.shopierOrderId, status: refundRequests.status, ownerNote: refundRequests.ownerNote })
    .from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).leftJoin(bundles, eq(bundles.id, shopierPurchases.bundleId))
    .where(and(eq(refundRequests.userId, userId), or(eq(refundRequests.status, "pending"), gt(refundRequests.decidedAt, new Date(now.getTime() - refundNoticeDays * 86_400_000)))))
    .orderBy(desc(refundRequests.createdAt), desc(refundRequests.id)).limit(10);
}

export const pendingRefundCount = (db: Database) => db.$count(refundRequests, eq(refundRequests.status, "pending"));

export async function listRefundRequests(db: Database, { status = "all", search = "", page = 1 }: Partial<RefundListParams> = {}) {
  const pattern = containsPattern(search);
  const where = and(status !== "all" ? eq(refundRequests.status, status) : undefined, search ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(shopierPurchases.shopierOrderId, pattern), ilike(courses.slug, pattern)) : undefined);
  const [items, [total], counts] = await Promise.all([
    db.select({ id: refundRequests.id, orderId: shopierPurchases.shopierOrderId, courseId: sql<string>`coalesce(${bundles.id}, ${courses.id})`, productId: soldProductId, course: soldSlug, bundled: sql<boolean>`${shopierPurchases.bundleId} is not null`, name: user.name, email: user.email,
      reason: refundRequests.reason, amountKurus: unitAmountKurus, currency: shopierPurchases.currency, at: refundRequests.createdAt, status: refundRequests.status,
      refundAmountKurus: refundRequests.amountKurus, ownerNote: refundRequests.ownerNote, decidedAt: refundRequests.decidedAt, shopierRefundId: refundRequests.shopierRefundId, completed: shopierRefunds.id,
    }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).leftJoin(bundles, eq(bundles.id, shopierPurchases.bundleId)).leftJoin(shopierRefunds, eq(shopierRefunds.id, refundRequests.shopierRefundId))
      .where(where).orderBy(desc(refundRequests.createdAt), desc(refundRequests.id)).limit(refundPageSize).offset((page - 1) * refundPageSize),
    db.select({ value: count() }).from(refundRequests).innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).innerJoin(user, eq(user.id, refundRequests.userId)).where(where),
    db.select({ status: refundRequests.status, value: count() }).from(refundRequests).groupBy(refundRequests.status),
  ]);
  return { items: items.map(item => ({ ...item, at: item.at.toISOString(), decidedAt: item.decidedAt?.toISOString() ?? null, completed: Boolean(item.completed) })),
    total: total.value, pages: Math.max(1, Math.ceil(total.value / refundPageSize)),
    counts: { pending: 0, approved: 0, declined: 0, ...Object.fromEntries(counts.map(row => [row.status, row.value])) } as Record<RefundStatus, number> };
}
