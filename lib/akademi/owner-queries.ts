"use client";

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { CourseChange } from "./owner-forms";

const courseSchema = z.object({
  id: z.string(), slug: z.string(), productId: z.string(), title: z.string(),
  priceKurus: z.number().nullable(), discounted: z.boolean(), accessDurationDays: z.number(),
  sales: z.number(), claimed: z.number(), status: z.enum(["published", "draft", "archived"]),
  product: z.object({ description: z.string(), listPriceKurus: z.number().nullable(), image: z.string().nullable(), hidden: z.boolean(), inStock: z.boolean(), url: z.string().nullable() }).nullable(),
});
const saleSchema = z.object({
  id: z.string(), order: z.string(), productId: z.string(), email: z.string(), amount: z.number(),
  at: z.string().datetime(), claimed: z.boolean(), title: z.string(),
});
const attentionSchema = z.object({
  provider: z.string(), eventIdentity: z.string(), attempts: z.number(), error: z.string().nullable(), at: z.string().datetime(),
});
export const ownerCatalogSnapshotSchema = z.object({
  courses: z.array(courseSchema),
  recentSales: z.array(saleSchema),
  attention: z.array(attentionSchema),
});
export type OwnerCatalogSnapshot = z.infer<typeof ownerCatalogSnapshotSchema>;
export type OwnerCourse = OwnerCatalogSnapshot["courses"][number];
const ownerTransactionsSchema = z.object({
  items: z.array(z.object({
    id: z.string(), order: z.string(), kind: z.enum(["sale", "refund"]), at: z.string().datetime(),
    amount: z.number(), currency: z.string(), title: z.string(), email: z.string().nullable(),
  })),
  unavailable: z.boolean(), refundsUnavailable: z.boolean(),
});
export type OwnerTransactions = z.infer<typeof ownerTransactionsSchema>;

export const ownerQueryKeys = {
  all: ["owner"] as const,
  catalog: () => [...ownerQueryKeys.all, "catalog"] as const,
  transactions: (from: string, to: string) => [...ownerQueryKeys.all, "transactions", { from, to }] as const,
  muxLibrary: () => [...ownerQueryKeys.all, "mux-library"] as const,
  uploadStatus: (lessonId: string, uploadId: string | null) => [...ownerQueryKeys.all, "upload-status", lessonId, uploadId] as const,
  preview: (lessonId: string, playbackId?: string | null) => [...ownerQueryKeys.all, "preview", lessonId, playbackId] as const,
};

async function ownerFetch(url: string, init: RequestInit, fallback: string) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? fallback);
  return response;
}

export function ownerTransactionsQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: ownerQueryKeys.transactions(from, to),
    queryFn: async ({ signal }): Promise<OwnerTransactions> => ownerTransactionsSchema.parse(
      await (await ownerFetch(`/api/yonetim/transactions?${new URLSearchParams({ from, to })}`, { signal }, "Shopier işlemleri yüklenemedi.")).json()),
    staleTime: 30_000,
  });
}

export const updateOwnerCourse = (courseId: string, change: CourseChange) => ownerFetch(`/api/yonetim/courses/${courseId}`,
  { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(change) }, "Değişiklik kaydedilemedi.");
const productBody = (data: unknown, image: File | null) => { const body = new FormData(); body.set("data", JSON.stringify(data)); if (image) body.set("image", image); return body; };
export const updateOwnerProduct = (courseId: string, changes: Record<string, unknown>, image: File | null) => ownerFetch(`/api/yonetim/courses/${courseId}/product`,
  { method: "PUT", body: productBody(changes, image) }, "Shopier ürünü güncellenemedi.");
export const createOwnerCourse = async (course: Record<string, unknown>, image: File | null): Promise<{ courseId: string }> =>
  (await ownerFetch("/api/yonetim/courses", { method: "POST", body: productBody(course, image) }, "Eğitim oluşturulamadı.")).json();
export const syncOwnerCatalog = () => ownerFetch("/api/yonetim/courses/sync", { method: "POST" }, "Shopier eşitlemesi başarısız oldu.");

export function ownerCatalogQueryOptions(initialData: OwnerCatalogSnapshot) {
  return queryOptions({
    queryKey: ownerQueryKeys.catalog(),
    queryFn: async ({ signal }) => ownerCatalogSnapshotSchema.parse(await (await ownerFetch("/api/yonetim/courses", { signal }, "Yönetim verileri yenilenemedi.")).json()),
    initialData,
    staleTime: 20_000,
  });
}
