import { and, eq, inArray, like } from "drizzle-orm";
import { courseAccess, courses, providerEvents, shopierPurchases, shopierRefunds } from "../db/schema.ts";
import { buyerEmail, toKurus, type ShopierOrder } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";

/** Read-only evidence for a real Shopier order. A sync/claim alone cannot prove webhook delivery. */
export async function verifyShopierDelivery(db: Database, order: ShopierOrder) {
  const linked = await db.select().from(courses).where(inArray(courses.shopierProductId, order.lineItems.map(line => line.productId)));
  const purchases = await db.select().from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, order.id));
  const receipts = await db.select({ id: providerEvents.id }).from(providerEvents).where(and(
    eq(providerEvents.provider, "shopier"), eq(providerEvents.resourceId, order.id),
    like(providerEvents.eventIdentity, "order.created:%"), eq(providerEvents.status, "processed"),
  ));
  const refunds = await db.select({ id: shopierRefunds.id }).from(shopierRefunds).where(and(eq(shopierRefunds.shopierOrderId, order.id), eq(shopierRefunds.type, "full")));
  const grants = purchases.length ? await db.select().from(courseAccess).where(inArray(courseAccess.sourcePurchaseId, purchases.map(p => p.id))) : [];
  const recorded = order.paymentStatus === "paid" && linked.length > 0 && linked.every(course => {
    const purchase = purchases.find(p => p.courseId === course.id);
    return purchase && purchase.buyerEmail === buyerEmail(order) && purchase.currency === order.currency
      && purchase.amountKurus === order.lineItems.filter(line => line.productId === course.shopierProductId).reduce((total, line) => total + toKurus(line.total), 0);
  });
  const accessRecorded = recorded && refunds.length === 0 && purchases.every(p => p.userId && grants.some(g =>
    g.sourcePurchaseId === p.id && g.userId === p.userId && g.courseId === p.courseId
    && (g.revokedAt === null || g.revocationReason === "extended_by_purchase")));
  return { orderId: order.id, webhookProcessed: receipts.length > 0, purchaseRecorded: recorded,
    accessRecorded, fullRefundRecorded: refunds.length > 0, unclaimedCourses: purchases.filter(p => !p.userId).length,
    verified: receipts.length > 0 && recorded && accessRecorded };
}
