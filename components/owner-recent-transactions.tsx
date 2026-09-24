"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney, shortDate } from "@/lib/akademi/format";
import { ownerTransactionsQueryOptions } from "@/lib/akademi/owner-queries";

export function OwnerRecentTransactions({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, isFetching } = useQuery(ownerTransactionsQueryOptions(from, to));

  if (isPending) return <div className="flex min-h-32 items-center justify-center"><Spinner className="size-5 text-forest" aria-label="İşlemler yükleniyor" /></div>;
  if (!data) return <p className="mt-6 text-sm text-stone" role="status">Shopier işlemleri şu anda yüklenemiyor. Birazdan yeniden deneyin.</p>;
  return <>
    {isError && <p className="mt-3 text-sm text-stone" role="status">Yenileme başarısız oldu; son yüklenen veriler gösteriliyor.</p>}
    {isFetching && <p className="sr-only" aria-live="polite">Shopier işlemleri yenileniyor</p>}
    {data.unavailable && <p className="mt-3 text-sm text-stone">Shopier işlemleri şu anda tam alınamıyor.</p>}
    {data.refundsUnavailable && <p className="mt-3 text-sm text-stone">İade bilgileri şu anda Shopier’den alınamıyor; satışlar gösteriliyor.</p>}
    {data.items.length ? <Table className="mt-5"><TableHeader><TableRow><TableHead>İşlem</TableHead><TableHead>Detay</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{data.items.map(item => <TableRow key={item.id}><TableCell><div className="flex items-center gap-2"><Badge variant={item.kind === "refund" ? "destructive" : "secondary"}>{item.kind === "refund" ? "İade" : "Satış"}</Badge><span className="font-medium">#{item.order}</span></div></TableCell><TableCell><span className="block max-w-[280px] truncate">{item.title}</span>{item.email && <span className="text-xs text-stone">{item.email}</span>}</TableCell><TableCell className="whitespace-nowrap text-stone">{shortDate.format(new Date(item.at))}</TableCell><TableCell className={cn("text-right font-semibold", item.kind === "refund" ? "text-destructive" : "text-forest")}>{formatMoney(item.amount, item.currency)}</TableCell></TableRow>)}</TableBody></Table> : <p className="mt-6 text-sm text-stone">Seçilen dönemde Shopier işlemi yok.</p>}
  </>;
}
