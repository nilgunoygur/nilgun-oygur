import { and, eq, sql } from "drizzle-orm";
import { adminAuditLog, courses, refundRequests, shopierPurchases, shopierRefunds } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { isEditableProduct, ShopierError, toKurus, type NewProduct, type ProductChanges, type ShopierClient } from "../shopier/api.ts";
import { linkCourse } from "./catalog.ts";

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

export function setCourseStatus(db: Database, actorId: string, courseId: string, status: CourseStatus) {
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
  const [course] = await db.select({ productId: courses.shopierProductId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new OwnerInputError("Eğitim bulunamadı.");
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
  const created = await withShopier(db, actorId, { resourceType: "catalog", resourceId: "shopier" }, "course.create", `yeni ürün “${product.title}”`, () => shopier.createProduct(product));
  const courseId = (await linkCourse(db, created, { accessDurationDays, status }))!;
  await db.insert(adminAuditLog).values({ actorId, action: "course.linked", resourceType: "course", resourceId: courseId, reason: `Shopier ürünü ${created.id} eğitim olarak bağlandı (${status})` });
  return { courseId, product: created };
}

export type RefundDecision = { approve: true; amountKurus: number; note: string } | { approve: false; note: string };

/** Approving asks Shopier to send the money back; access is removed once Shopier confirms a full refund. Returns that refund, or null for a decline. */
export async function decideRefundRequest(db: Database, actorId: string, requestId: string, decision: RefundDecision, shopier: Pick<ShopierClient, "createRefund">) {
  const [request] = await db.select({ orderId: shopierPurchases.shopierOrderId }).from(refundRequests)
    .innerJoin(shopierPurchases, eq(shopierPurchases.id, refundRequests.purchaseId)).where(eq(refundRequests.id, requestId)).limit(1);
  if (!request) throw new OwnerInputError("İade talebi bulunamadı.");
  const target = { resourceType: "refund_request", resourceId: requestId };
  const pending = and(eq(refundRequests.id, requestId), eq(refundRequests.status, "pending"));
  const decided = { decidedBy: actorId, decidedAt: new Date(), ownerNote: decision.note || null };
  const alreadyDecided = new OwnerInputError("Bu talep zaten sonuçlandırılmış.");
  if (!decision.approve) {
    const declined = await audited(db, actorId, { action: "refund_request.declined", ...target, reason: decision.note || "İade talebi reddedildi" },
      async tx => (await tx.update(refundRequests).set({ status: "declined", ...decided }).where(pending).returning({ id: refundRequests.id })).length > 0);
    if (!declined) throw alreadyDecided;
    return null;
  }
  const [[{ paid }], [{ refunded }]] = await Promise.all([
    db.select({ paid: sql<number>`coalesce(sum(${shopierPurchases.amountKurus}), 0)::int` }).from(shopierPurchases).where(eq(shopierPurchases.shopierOrderId, request.orderId)),
    db.select({ refunded: sql<number>`coalesce(sum(${shopierRefunds.amountKurus}), 0)::int` }).from(shopierRefunds).where(eq(shopierRefunds.shopierOrderId, request.orderId)),
  ]);
  if (decision.amountKurus > paid - refunded) throw new OwnerInputError("İade tutarı siparişin kalan tutarını aşamaz.");
  // Claimed before the Shopier call, so two approvals cannot send the money twice.
  const claimed = await db.update(refundRequests).set({ status: "approved", amountKurus: decision.amountKurus, ...decided }).where(pending).returning({ id: refundRequests.id });
  if (!claimed.length) throw alreadyDecided;
  try {
    const refund = await withShopier(db, actorId, target, "refund_request.refund", `sipariş ${request.orderId} için ${(decision.amountKurus / 100).toFixed(2)} iade`,
      () => shopier.createRefund(request.orderId, decision.amountKurus, decision.note || undefined));
    await db.update(refundRequests).set({ shopierRefundId: refund.id }).where(eq(refundRequests.id, requestId));
    return refund;
  } catch (error) {
    // Shopier refused, so no money moved: reopen the request. Anything else may have gone through, so it stays approved for the owner to check.
    if (error instanceof ShopierError && error.status < 500) await db.update(refundRequests).set({ status: "pending", amountKurus: null, decidedBy: null, decidedAt: null, ownerNote: null }).where(eq(refundRequests.id, requestId));
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
