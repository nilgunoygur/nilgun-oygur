import type { Config } from "../config.ts";
import type { Database } from "../db/types.ts";
import type { ShopierClient } from "../shopier/api.ts";
import { activeCourseAccess, claimShopierOrder, recordShopierOrder } from "./course-access.ts";
import { findCatalogCourse, listCatalog, ownerCatalog, productCards, syncCatalogFromShopier } from "./catalog.ts";
import { setAccessDuration, setCourseStatus, syncCatalogAsOwner, type CourseStatus } from "./owner-commands.ts";
import { failedEvents } from "./provider-inbox.ts";
import { handleShopierWebhook } from "./shopier-webhook.ts";
import { consumeAttempt } from "./rate-limit.ts";

type Dependencies = {
  db: Database;
  shopier: Pick<ShopierClient, "getOrder" | "getProduct" | "listProducts" | "listOrdersSince">;
  config: Pick<Config, "shopier">;
  now?: () => Date;
};

// Composition root: wires the Akademi modules to one database, one Shopier adapter and one config.
// Production builds it from env in server.ts; tests build it with PGlite and a fake Shopier.
export function createAkademi({ db, shopier, config, now = () => new Date() }: Dependencies) {
  const options = { includeHidden: config.shopier.includeHidden };
  const syncCatalog = () => syncCatalogFromShopier(db, shopier, options);
  const products = async () => (await shopier.listProducts()).products;

  return {
    catalog: {
      list: async () => listCatalog(db, await products(), options),
      find: (slug: string) => findCatalogCourse(db, slug, id => shopier.getProduct(id), options),
      cards: async () => productCards(await products()),
      sync: syncCatalog,
    },
    access: {
      /** Active courses for a verified student; titles come from the (cached) catalog. */
      active: (userId: string) => activeCourseAccess(db, userId, now()),
      /** "Siparişimi ekle": five attempts per student per hour, order verified against the Shopier API. */
      async claimOrder(userId: string, orderNumber: string, shopierEmail: string) {
        if (!await consumeAttempt(db, `shopier-claim:${userId}`, { max: 5, windowMs: 3_600_000, now: now().getTime() })) return "rate_limited" as const;
        return claimShopierOrder(db, await shopier.getOrder(orderNumber.trim()), shopierEmail, userId);
      },
      /** Reconciliation: replays recent orders and resyncs the catalog; idempotent. */
      async replayRecentOrders(days = 7) {
        const orders = await shopier.listOrdersSince(new Date(now().getTime() - days * 86_400_000));
        let purchases = 0, granted = 0;
        for (const order of orders) {
          const result = await recordShopierOrder(db, order);
          purchases += result.purchaseIds.length;
          granted += result.granted;
        }
        return { orders: orders.length, purchases, granted, courses: await syncCatalog() };
      },
    },
    owner: {
      catalog: async () => ownerCatalog(db, await products()),
      needsAttention: () => failedEvents(db),
      setCourseStatus: (actorId: string, courseId: string, status: CourseStatus) => setCourseStatus(db, actorId, courseId, status),
      setAccessDuration: (actorId: string, courseId: string, days: number) => setAccessDuration(db, actorId, courseId, days),
      syncCatalog: (actorId: string) => syncCatalogAsOwner(db, actorId, syncCatalog),
    },
    webhooks: {
      shopier: (rawBody: string, headers: Headers, tokens: string[]) => handleShopierWebhook(db, rawBody, headers, tokens, options),
    },
  };
}

export type Akademi = ReturnType<typeof createAkademi>;
