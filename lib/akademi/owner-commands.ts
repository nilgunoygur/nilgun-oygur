import { and, eq } from "drizzle-orm";
import { adminAuditLog, courses, newsletterSubscribers, refundRequests, shopierPurchases } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { isEditableProduct, ShopierError, toKurus, type NewProduct, type ProductChanges, type ShopierClient } from "../shopier/api.ts";
import { linkCourse } from "./catalog.ts";
import { formatMoney } from "./format.ts";
import { refundableKurus } from "./refunds.ts";

// Owner Commands: every owner change runs with its audit entry in one transaction, and only when something changed.
// Callers authorize the owner (verified session and owner row) before calling.

/** A problem with what the owner entered; its message is shown to them as is. */
export class OwnerInputError extends Error {}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type AuditEntry = { action: string; resourceType: string; resourceId: string; reason: string };

async function audited(db: Database, actorId: string, entry: AuditEntry, change: (tx: Transaction) => Promise<boolean>) {
  if (!entry.reason.trim()) throw new Error("Owner changes require a reason.");
  return db.transaction(async (tx) => {
    if (!await change(tx)) return false;
    await tx.insert(adminAuditLog).values({ actorId, ...entry });
    return true;
  });
}

export type CourseStatus = typeof courses.$inferSelect["status"];

export async function setCourseStatus(db: Database, actorId: string, courseId: string, status: CourseStatus, shopier: Pick<ShopierClient, "updateProduct">) {
  const [course] = await db.select({ productId: courses.shopierProductId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return false;
  // Shopier first, so a refused change never publishes; a repeat repairs drift.
  const hidden = status !== "published";
  await withShopier(db, actorId, { resourceType: "course", resourceId: courseId }, "course.visibility", hidden ? "mağazadan gizle" : "mağazada göster", async () => {
    const product = await shopier.updateProduct(course.productId, { hidden });
    if (Boolean(product.customListing) !== hidden) throw new OwnerInputError("Shopier mağaza görünürlüğünü güncellemedi. Yeniden deneyin.");
  });
  return audited(db, actorId, { action: `course.${status}`, resourceType: "course", resourceId: courseId, reason: "Durum değiştirildi" }, async (tx) => {
    const changed = await tx.update(courses).set({ status }).where(eq(courses.id, courseId)).returning({ id: courses.id });
    return changed.length > 0;
  });
}

/** Access duration is the one course setting that lives on the site rather than in Shopier. Existing grants keep their snapshot. */
export async function setAccessDuration(db: Database, actorId: string, courseId: string, days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Access duration must be 1–3650 whole days.");
  return audited(db, actorId, { action: "course.access_duration", resourceType: "course", resourceId: courseId, reason: `${days} gün` }, async (tx) => {
    const changed = await tx.update(courses).set({ accessDurationDays: days }).where(eq(courses.id, courseId)).returning({ id: courses.id });
    return changed.length > 0;
  });
}

const changeLabels: Record<keyof ProductChanges, string> = { title: "ad", description: "açıklama", priceKurus: "fiyat", discountedPriceKurus: "indirim", imageUrl: "kapak görseli", hidden: "mağaza görünürlüğü", inStock: "satış durumu" };

/** Shopier cannot share a transaction with Postgres, so the intent is recorded before the write and its outcome after. */
async function withShopier<T>(db: Database, actorId: string, target: { resourceType: string; resourceId: string }, action: string, what: string, write: () => Promise<T>): Promise<T> {
  const entry = (suffix: string, reason: string) => db.insert(adminAuditLog).values({ actorId, action: `${action}_${suffix}`, ...target, reason });
  await entry("requested", `Shopier’den istendi: ${what}`);
  let result: T;
  try {
    result = await write();
  } catch (error) {
    await entry("failed", `Shopier’de yapılamadı: ${what}`);
    throw error;
  }
  try {
    await entry("done", `Shopier’de yapıldı: ${what}`);
  } catch {
    throw new Error("Shopier’deki değişiklik yapıldı, ancak sonuç audit kaydı tamamlanamadı. Yeniden eşitleyip kayıtları kontrol edin.");
  }
  return result;
}

export async function updateCourseProduct(db: Database, actorId: string, courseId: string, changes: ProductChanges, shopier: Pick<ShopierClient, "getProduct" | "updateProduct">) {
  const changed = (Object.keys(changes) as (keyof ProductChanges)[]).filter(key => changes[key] !== undefined);
  if (!changed.length) throw new OwnerInputError("Değiştirilecek bir alan yok.");
  const [course] = await db.select({ productId: courses.shopierProductId, status: courses.status }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new OwnerInputError("Eğitim bulunamadı.");
  if (course.status === "published" && changes.hidden === true) throw new OwnerInputError("Yayındaki eğitim Shopier mağazasında görünür olmalıdır. Gizlemek için eğitimi taslağa alın.");
  const product = await shopier.getProduct(course.productId);
  if (!product || !isEditableProduct(product)) throw new OwnerInputError("Bu Shopier ürünü buradan düzenlenemiyor. Shopier panelinden kontrol edin.");
  // A discount is checked against the price it will sit beside, new or current.
  const priceKurus = changes.priceKurus ?? toKurus(product.priceData.price);
  const discountKurus = changes.discountedPriceKurus !== undefined ? changes.discountedPriceKurus : product.priceData.discount && product.priceData.discountedPrice ? toKurus(product.priceData.discountedPrice) : null;
  if (discountKurus !== null && discountKurus >= priceKurus) throw new OwnerInputError("İndirimli fiyat normal fiyattan düşük olmalıdır.");
  // Shopier takes the price and the discount as one block, so a change to either sends both.
  const pricing = changes.priceKurus !== undefined || changes.discountedPriceKurus !== undefined;
  return withShopier(db, actorId, { resourceType: "course", resourceId: courseId }, "course.product_change", changed.map(key => changeLabels[key]).join(", "),
    () => shopier.updateProduct(course.productId, pricing ? { ...changes, priceKurus, discountedPriceKurus: discountKurus } : changes));
}

export type NewCourse = NewProduct & { accessDurationDays: number; status: "draft" | "published" };

/** Links the course right away instead of waiting for Shopier's webhook. */
export async function createCourse(db: Database, actorId: string, { accessDurationDays, status, ...product }: NewCourse, shopier: Pick<ShopierClient, "createProduct">) {
  const created = await withShopier(db, actorId, { resourceType: "catalog", resourceId: "shopier" }, "course.create", `yeni ürün “${product.title}”`, () => shopier.createProduct({ ...product, hidden: status === "published" ? false : product.hidden }));
  const courseId = (await linkCourse(db, created, { accessDurationDays, status }))!;
  await db.insert(adminAuditLog).values({ actorId, action: "course.linked", resourceType: "course", resourceId: courseId, reason: `Shopier ürünü ${created.id} eğitim olarak bağlandı (${status})` });
  return { courseId, product: created };
}

export type RefundDecision = { approve: true; amountKurus: number; note: string } | { approve: false; note: string };

/** Returns Shopier's refund, or null for a decline. */
export async function decideRefundRequest(db: Database, actorId: string, requestId: string, decision: RefundDecision, shopier: Pick<ShopierClient, "createRefund">) {
  const [request] = await db.select({ orderId: shopierPurchases.shopierOrderId }).from(refundRequests)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).where(eq(refundRequests.id, requestId)).limit(1);
  if (!request) throw new OwnerInputError("İade talebi bulunamadı.");
  const target = { resourceType: "refund_request", resourceId: requestId };
  const pending = and(eq(refundRequests.id, requestId), eq(refundRequests.status, "pending"));
  const decided = { decidedBy: actorId, decidedAt: new Date(), ownerNote: decision.note || null };
  const alreadyDecided = () => new OwnerInputError("Bu talep zaten sonuçlandırılmış.");
  if (!decision.approve) {
    const declined = await audited(db, actorId, { action: "refund_request.declined", ...target, reason: decision.note || "İade talebi reddedildi" },
      async tx => (await tx.update(refundRequests).set({ status: "declined", ...decided }).where(pending).returning({ id: refundRequests.id })).length > 0);
    if (!declined) throw alreadyDecided();
    return null;
  }
  if (decision.amountKurus > await refundableKurus(db, request.orderId)) throw new OwnerInputError("İade tutarı siparişin kalan tutarını aşamaz.");
  // Claimed first, so two approvals cannot refund twice.
  const claimed = await db.update(refundRequests).set({ status: "approved", amountKurus: decision.amountKurus, ...decided }).where(pending).returning({ id: refundRequests.id });
  if (!claimed.length) throw alreadyDecided();
  try {
    const refund = await withShopier(db, actorId, target, "refund_request.refund", `sipariş ${request.orderId} için ${formatMoney(decision.amountKurus)} iade`,
      () => shopier.createRefund(request.orderId, decision.amountKurus, decision.note || undefined));
    await db.update(refundRequests).set({ shopierRefundId: refund.id }).where(eq(refundRequests.id, requestId));
    return refund;
  } catch (error) {
    // A refusal moved no money: reopen. Anything else stays approved for the owner to check.
    if (error instanceof ShopierError && error.refused) await db.update(refundRequests).set({ status: "pending", amountKurus: null, decidedBy: null, decidedAt: null, ownerNote: null }).where(eq(refundRequests.id, requestId));
    throw error;
  }
}

/** Runs the catalog sync, then records who asked for it. */
export function syncCatalogAsOwner(db: Database, actorId: string, sync: () => Promise<{ added: number; archived: number }>) {
  return sync().then(async (result) => {
    await audited(db, actorId, { action: "catalog.sync", resourceType: "catalog", resourceId: "shopier", reason: `Shopier ile eşitlendi (+${result.added}, arşiv ${result.archived})` }, async () => true);
    return result;
  });
}

/** The audit entry keeps only the id, so the address itself is gone. */
export function removeSubscriber(db: Database, actorId: string, subscriberId: string) {
  return audited(db, actorId, { action: "newsletter.subscriber_removed", resourceType: "newsletter_subscriber", resourceId: subscriberId, reason: "Bülten abonesi listeden silindi" },
    async tx => (await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId)).returning({ id: newsletterSubscribers.id })).length > 0);
}
