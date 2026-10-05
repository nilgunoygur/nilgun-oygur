import { and, eq, inArray, like } from "drizzle-orm";
import { courseAccess, courses, providerEvents, shopierPurchases } from "../db/schema.ts";
import { buyerEmail, productTotalKurus, type ShopierOrder } from "../shopier/api.ts";
import type { Database } from "../db/types.ts";
import { hasFullRefund } from "./course-access.ts";

/** Read-only; a sync or claim alone does not prove webhook delivery. */
export async function verifyShopierDelivery(db: Database, order: ShopierOrder) {
  const linked = await db.select().from(courses).where(inArray(courses.shopierProductId, order.lineItems.map(line => line.productId)));
  const purchases = await db.select().from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, order.id));
  const receipts = await db.select({ id: providerEvents.id }).from(providerEvents).where(and(
    eq(providerEvents.provider, "shopier"), eq(providerEvents.resourceId, order.id),
    like(providerEvents.eventIdentity, "order.created:%"), eq(providerEvents.status, "processed"),
  ));
  const refunded = await hasFullRefund(db, order.id);
  const grants = purchases.length ? await db.select().from(courseAccess).where(inArray(courseAccess.sourcePurchaseId, purchases.map(p => p.id))) : [];
  const recorded = order.paymentStatus === "paid" && linked.length > 0 && linked.every(course => {
    const purchase = purchases.find(p => p.courseId === course.id);
    return purchase && purchase.buyerEmail === buyerEmail(order) && purchase.currency === order.currency
      && purchase.amountKurus === productTotalKurus(order, course.shopierProductId);
  });
  const accessRecorded = recorded && !refunded && purchases.every(p => p.userId && grants.some(g =>
    g.sourcePurchaseId === p.id && g.userId === p.userId && g.courseId === p.courseId
    && (g.revokedAt === null || g.revocationReason === "extended_by_purchase")));
  const webhookProcessed = receipts.length > 0;
  return { orderId: order.id, webhookProcessed, purchaseRecorded: recorded,
    accessRecorded, fullRefundRecorded: refunded, unclaimedCourses: purchases.filter(p => !p.userId).length,
    verified: webhookProcessed && accessRecorded };
}
