"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  order: string;
  kind: "sale" | "refund";
  at: string;
  amount: number;
  currency: string;
  title: string;
  email: string | null;
};
type ResponseData = { items: Transaction[]; unavailable: boolean; refundsUnavailable: boolean };
const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100); }
  catch { return `${(amount / 100).toLocaleString("tr-TR")} ${currency}`; }
};

export function OwnerRecentTransactions({ from, to }: { from: string; to: string }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 300_000, retry: 1, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}><TransactionResults from={from} to={to} /></QueryClientProvider>;
}

function TransactionResults({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError } = useQuery<ResponseData>({
    queryKey: ["owner-transactions", from, to],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(`/api/yonetim/transactions?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Shopier işlemleri yüklenemedi.");
      return response.json() as Promise<ResponseData>;
    },
  });

  if (isPending) return <div className="flex min-h-32 items-center justify-center"><Spinner className="size-5 text-forest" aria-label="İşlemler yükleniyor" /></div>;
  if (isError || data.unavailable) return <p className="mt-6 text-sm text-stone">Shopier işlemleri şu anda yüklenemiyor.</p>;
  return <>
    {data.refundsUnavailable && <p className="mt-3 text-sm text-stone">İade bilgileri şu anda Shopier’den alınamıyor; satışlar gösteriliyor.</p>}
    {data.items.length ? <Table className="mt-5"><TableHeader><TableRow><TableHead>İşlem</TableHead><TableHead>Detay</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{data.items.map(item => <TableRow key={item.id}><TableCell><div className="flex items-center gap-2"><Badge variant={item.kind === "refund" ? "destructive" : "secondary"}>{item.kind === "refund" ? "İade" : "Satış"}</Badge><span className="font-medium">#{item.order}</span></div></TableCell><TableCell><span className="block max-w-[280px] truncate">{item.title}</span>{item.email && <span className="text-xs text-stone">{item.email}</span>}</TableCell><TableCell className="whitespace-nowrap text-stone">{shortDate.format(new Date(item.at))}</TableCell><TableCell className={cn("text-right font-semibold", item.kind === "refund" ? "text-destructive" : "text-forest")}>{money(item.amount, item.currency)}</TableCell></TableRow>)}</TableBody></Table> : <p className="mt-6 text-sm text-stone">Seçilen dönemde Shopier işlemi yok.</p>}
  </>;
}
