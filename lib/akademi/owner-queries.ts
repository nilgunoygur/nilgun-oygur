"use client";

import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { CourseChange } from "./owner-forms";

const courseSchema = z.object({
  id: z.string(), slug: z.string(), productId: z.string(), title: z.string(),
  priceKurus: z.number().nullable(), discounted: z.boolean(), accessDurationDays: z.number(),
  sales: z.number(), claimed: z.number(), status: z.enum(["published", "draft", "archived"]),
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
};

export function ownerTransactionsQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: ownerQueryKeys.transactions(from, to),
    queryFn: async ({ signal }): Promise<OwnerTransactions> => {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(`/api/yonetim/transactions?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Shopier işlemleri yüklenemedi.");
      return ownerTransactionsSchema.parse(await response.json());
    },
    staleTime: 30_000,
  });
}

export async function fetchOwnerCatalog(signal?: AbortSignal): Promise<OwnerCatalogSnapshot> {
  const response = await fetch("/api/yonetim/courses", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Yönetim verileri yenilenemedi.");
  return ownerCatalogSnapshotSchema.parse(await response.json());
}

async function ownerRequest(url: string, init: RequestInit, fallback: string) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? fallback);
}

export const updateOwnerCourse = (courseId: string, change: CourseChange) => ownerRequest(`/api/yonetim/courses/${courseId}`,
  { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(change) }, "Değişiklik kaydedilemedi.");
export const syncOwnerCatalog = () => ownerRequest("/api/yonetim/courses/sync", { method: "POST" }, "Shopier eşitlemesi başarısız oldu.");

export function ownerCatalogQueryOptions(initialData: OwnerCatalogSnapshot) {
  return queryOptions({
    queryKey: ownerQueryKeys.catalog(),
    queryFn: ({ signal }) => fetchOwnerCatalog(signal),
    initialData,
    staleTime: 20_000,
  });
}
