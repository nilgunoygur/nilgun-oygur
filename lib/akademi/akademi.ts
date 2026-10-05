import type { Database } from "../db/types.ts";
import type { ProductChanges, ShopierClient } from "../shopier/api.ts";
import { activeCourseAccess, claimShopierOrder, recordShopierOrder } from "./course-access.ts";
import { findCatalogCourse, listCatalog, ownerCatalog, productCards, syncCatalogFromShopier } from "./catalog.ts";
import { createCourse, decideRefundRequest, setAccessDuration, setCourseStatus, syncCatalogAsOwner, updateCourseProduct, type CourseStatus, type NewCourse, type RefundDecision } from "./owner-commands.ts";
import { failedEvents } from "./provider-inbox.ts";
import { createOwnerOverview } from "./dashboard.ts";
import { ownerUsers, type UserListParams } from "./owner-users.ts";
import { handleShopierWebhook } from "./shopier-webhook.ts";
import { consumeAttempt } from "./rate-limit.ts";
import { studentContact } from "./student-contact.ts";
import { partialRefundReviews, recordNewShopierRefunds, recordShopierRefund } from "./refunds.ts";
import type { RefundListParams } from "./owner-forms.ts";
import { latestRefundRequest, pendingRefundCount, requestRefund, listRefundRequests, studentRefundRequests, type RefundNotification } from "./refund-requests.ts";

type Dependencies = {
  db: Database;
  refundNotification?: RefundNotification;
  shopier: Pick<ShopierClient, "getOrder" | "getProduct" | "listProducts" | "listOrdersSince" | "listRecentTransactions" | "listSucceededRefunds" | "createRefund" | "createProduct" | "updateProduct">;
  now?: () => Date;
};

// Composition root: wires the Akademi modules to one database and one Shopier adapter.
// Production builds it from env in server.ts; tests build it with PGlite and a fake Shopier.
export function createAkademi({ db, shopier, refundNotification, now = () => new Date() }: Dependencies) {
  const syncCatalog = () => syncCatalogFromShopier(db, shopier);
  const products = async () => (await shopier.listProducts()).products;
  const ownerOverview = createOwnerOverview({ db, shopier, now });

  return {
    catalog: {
      list: async () => listCatalog(db, await products()),
      find: (slug: string) => findCatalogCourse(db, slug, id => shopier.getProduct(id)),
      cards: async () => productCards(await products()),
      sync: syncCatalog,
    },
    access: {
      /** Active courses for a verified student; titles come from the (cached) catalog. */
      active: (userId: string) => activeCourseAccess(db, userId, now()),
      /** "Siparişimi ekle": five attempts per student per hour, order verified against the Shopier API. */
      async claimOrder(userId: string, orderNumber: string, shopierEmail: string) {
        if (!await consumeAttempt(db, `shopier-claim:${userId}`, { max: 5, windowMs: 3_600_000, now: now().getTime() })) return "rate_limited" as const;
        const order = await shopier.getOrder(orderNumber.trim());
        if (order) await recordNewShopierRefunds(db, await shopier.listSucceededRefunds({ orderId: order.id }));
        return claimShopierOrder(db, order, shopierEmail, userId);
      },
      async requestRefund(userId: string, courseId: string, reason: string) {
        if (!await consumeAttempt(db, `refund-request:${userId}`, { max: 3, windowMs: 86_400_000, now: now().getTime() })) return "rate_limited" as const;
        return requestRefund(db, userId, courseId, reason, refundNotification);
      },
      refundRequest: (userId: string, courseId: string) => latestRefundRequest(db, userId, courseId),
      /** The newest request per course; an approved one is dropped once the course is bought again. */
      async refundNotices(userId: string) {
        const [requests, access] = await Promise.all([studentRefundRequests(db, userId, now()), activeCourseAccess(db, userId, now())]);
        const active = new Set(access.map(item => item.courseId)), seen = new Set<string>();
        return requests.filter(request => !seen.has(request.courseId) && seen.add(request.courseId) && (request.status !== "approved" || !active.has(request.courseId)));
      },
      /** Reconciliation: replays recent orders and resyncs the catalog; idempotent. */
      async replayRecentOrders(days = 7) {
        const [refunds, orders] = await Promise.all([shopier.listSucceededRefunds(), shopier.listOrdersSince(new Date(now().getTime() - days * 86_400_000))]);
        await recordNewShopierRefunds(db, refunds);
        let purchases = 0, granted = 0;
        for (const order of orders) {
          const result = await recordShopierOrder(db, order);
          purchases += result.purchaseIds.length;
          granted += result.granted;
        }
        return { orders: orders.length, purchases, granted, refunds: refunds.length, courses: await syncCatalog() };
      },
    },
    students: {
      contact: (userId: string) => studentContact(db, userId),
    },
    owner: {
      overview: ownerOverview,
      refundRequests: (input: Partial<RefundListParams>) => listRefundRequests(db, input),
      /** JSON-safe; shared by the page and GET /api/yonetim/courses. */
      async catalogSnapshot() {
        const [{ courses, recentSales }, attention, refundReviews, pendingRefunds] = await Promise.all([ownerCatalog(db, await products()), failedEvents(db), partialRefundReviews(db), pendingRefundCount(db)]);
        return {
          courses,
          recentSales: recentSales.map(sale => ({ ...sale, claimed: Boolean(sale.claimed), at: sale.at.toISOString() })),
          attention: attention.map(item => ({ ...item, at: item.at.toISOString() })),
          refundReviews: refundReviews.map(item => ({ ...item, at: item.at.toISOString() })),
          pendingRefunds,
        };
      },
      users: (params: UserListParams) => ownerUsers(db, params, now()),
      setCourseStatus: (actorId: string, courseId: string, status: CourseStatus) => setCourseStatus(db, actorId, courseId, status, shopier),
      setAccessDuration: (actorId: string, courseId: string, days: number) => setAccessDuration(db, actorId, courseId, days),
      updateCourseProduct: (actorId: string, courseId: string, changes: ProductChanges) => updateCourseProduct(db, actorId, courseId, changes, shopier),
      createCourse: (actorId: string, course: NewCourse) => createCourse(db, actorId, course, shopier),
      /** A refund Shopier completes at once is applied now. */
      async decideRefundRequest(actorId: string, requestId: string, decision: RefundDecision) {
        const refund = await decideRefundRequest(db, actorId, requestId, decision, shopier);
        if (refund) await recordShopierRefund(db, refund);
      },
      syncCatalog: (actorId: string) => syncCatalogAsOwner(db, actorId, syncCatalog),
    },
    webhooks: {
      shopier: (rawBody: string, headers: Headers, tokens: string[]) => handleShopierWebhook(db, rawBody, headers, tokens),
    },
  };
}

export type Akademi = ReturnType<typeof createAkademi>;
