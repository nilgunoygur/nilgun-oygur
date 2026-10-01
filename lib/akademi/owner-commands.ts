import { eq } from "drizzle-orm";
import { adminAuditLog, courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { toKurus, type ProductChanges, type ShopierClient } from "../shopier/api.ts";
import { linkOwnerCourse } from "./catalog.ts";

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

/** Shopier cannot share a transaction with Postgres, so an intent is recorded before the external write and its outcome after. */
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

/** Title, description, price, discount, cover, visibility and stock live in Shopier; only the given fields change. */
export async function updateCourseProduct(db: Database, actorId: string, courseId: string, changes: ProductChanges, shopier: Pick<ShopierClient, "getProduct" | "updateProduct">) {
  const changed = (Object.keys(changes) as (keyof ProductChanges)[]).filter(key => changes[key] !== undefined);
  if (!changed.length) throw new OwnerInputError("Değiştirilecek bir alan yok.");
  const [course] = await db.select({ productId: courses.shopierProductId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new OwnerInputError("Eğitim bulunamadı.");
  const product = await shopier.getProduct(course.productId);
  if (!product || product.type !== "digital" || product.priceData.currency !== "TRY") throw new OwnerInputError("Bu Shopier ürünü buradan düzenlenemiyor. Shopier panelinden kontrol edin.");
  // A discount is checked against the price it will sit beside, new or current.
  const priceKurus = changes.priceKurus ?? toKurus(product.priceData.price);
  const discountKurus = changes.discountedPriceKurus !== undefined ? changes.discountedPriceKurus : product.priceData.discount && product.priceData.discountedPrice ? toKurus(product.priceData.discountedPrice) : null;
  if (discountKurus !== null && discountKurus >= priceKurus) throw new OwnerInputError("İndirimli fiyat normal fiyattan düşük olmalıdır.");
  // Shopier takes the price and the discount as one block, so a change to either sends both.
  const pricing = changes.priceKurus !== undefined || changes.discountedPriceKurus !== undefined;
  return withShopier(db, actorId, { resourceType: "course", resourceId: courseId }, "course.product_change", changed.map(key => changeLabels[key]).join(", "),
    () => shopier.updateProduct(course.productId, pricing ? { ...changes, priceKurus, discountedPriceKurus: discountKurus } : changes));
}

export type NewCourse = Required<Pick<ProductChanges, "title" | "description" | "priceKurus" | "imageUrl">> & Pick<ProductChanges, "discountedPriceKurus" | "hidden"> & { accessDurationDays: number; status: "draft" | "published" };

/** Creates the Shopier product, then links it as a course without waiting for Shopier's webhook. */
export async function createCourse(db: Database, actorId: string, { accessDurationDays, status, ...product }: NewCourse, shopier: Pick<ShopierClient, "createProduct">) {
  if (!Number.isInteger(accessDurationDays) || accessDurationDays < 1 || accessDurationDays > 3650) throw new Error("Access duration must be 1–3650 whole days.");
  if (product.discountedPriceKurus != null && product.discountedPriceKurus >= product.priceKurus) throw new OwnerInputError("İndirimli fiyat normal fiyattan düşük olmalıdır.");
  const created = await withShopier(db, actorId, { resourceType: "catalog", resourceId: "shopier" }, "course.create", `yeni ürün “${product.title}”`, () => shopier.createProduct(product));
  const courseId = await linkOwnerCourse(db, created, { accessDurationDays, status });
  await db.insert(adminAuditLog).values({ actorId, action: "course.linked", resourceType: "course", resourceId: courseId, reason: `Shopier ürünü ${created.id} eğitim olarak bağlandı (${status})` });
  return { courseId, product: created };
}

/** Runs the catalog sync, then records who asked for it. */
export function syncCatalogAsOwner(db: Database, actorId: string, sync: () => Promise<{ added: number; archived: number }>) {
  return sync().then(async (result) => {
    await audited(db, actorId, { action: "catalog.sync", resourceType: "catalog", resourceId: "shopier", reason: `Shopier ile eşitlendi (+${result.added}, arşiv ${result.archived})` }, async () => true);
    return result;
  });
}
