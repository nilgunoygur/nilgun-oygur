"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, RefreshCw, Search, Undo2, X } from "lucide-react";
import { ownerRefundQueryOptions, type OwnerRefundList } from "@/lib/akademi/owner-queries";
import { dateTimeLabel, formatMoney } from "@/lib/akademi/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefundDecisionForm } from "./refund-decision-form";

type Refund = OwnerRefundList["items"][number];
const filters = [{ value: "pending", label: "Karar bekleyen" }, { value: "approved", label: "Onaylanan" }, { value: "declined", label: "Reddedilen" }, { value: "all", label: "Tümü" }];
function statusLabel(row: Refund) {
  if (row.status === "pending") return "Karar bekliyor";
  if (row.status === "declined") return "Reddedildi";
  if (row.completed) return "İade tamamlandı";
  return row.shopierRefundId ? "Shopier’e gönderildi" : "Shopier’de kontrol edin";
}
export function OwnerRefundManagement({ initialData }: { initialData: OwnerRefundList }) {
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{ request: Refund; approve: boolean } | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setFilter(search.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const { data, isFetching, isError, refetch } = useQuery(ownerRefundQueryOptions(status, filter, page, initialData));
  const counts = data?.counts ?? initialData.counts;
  const totalCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));
  return <>
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {[{ label: "Kararınızı bekleyen", value: counts.pending ?? 0, hint: "Öğrenci talepleri", accent: true }, { label: "Onaylanan talepler", value: counts.approved ?? 0, hint: "Shopier’e gönderilen veya kontrol bekleyen" }, { label: "Reddedilen talepler", value: counts.declined ?? 0, hint: "Karar geçmişi" }].map(item => <div key={item.label} className={cn("rounded-2xl border p-6", item.accent ? "border-forest bg-forest text-white" : "border-forest/10 bg-white")}><p className="text-sm font-medium">{item.label}</p><p className="my-3 text-4xl font-semibold tracking-tight tabular-nums">{item.value}</p><p className={cn("text-xs", item.accent ? "text-white/70" : "text-muted-foreground")}>{item.hint}</p></div>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <Tabs value={status} onValueChange={value => { if (typeof value === "string") { setStatus(value); setPage(1); } }}><TabsList className="max-w-full flex-wrap group-data-horizontal/tabs:h-auto">{filters.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="h-auto px-3 py-2">{tab.label}<span className="ml-2 text-xs tabular-nums text-muted-foreground">{tab.value === "all" ? totalCount : counts[tab.value] ?? 0}</span></TabsTrigger>)}</TabsList></Tabs>
        <div className="flex w-full items-center gap-2 sm:w-auto"><div className="relative flex-1"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Öğrenci, e-posta veya sipariş ara" aria-label="İade talebi ara" maxLength={100} className="w-full pl-9 sm:w-72" /></div><Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Talepleri yenile"><RefreshCw className={cn("size-4", isFetching && "animate-spin")} /></Button></div>
      </div>
      {isError ? <div role="alert" className="p-8 text-sm text-destructive">İade talepleri yüklenemedi. Yenile düğmesiyle tekrar deneyin.</div> : !data ? <p role="status" className="p-8 text-sm text-muted-foreground">Talepler yükleniyor…</p> : data.items.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><Undo2 className="size-8 text-forest/50" /><p className="font-medium">{filter ? "Aramanızla eşleşen talep yok." : "Bu bölümde iade talebi yok."}</p><p className="text-sm text-muted-foreground">{status === "pending" && !filter ? "Yeni talepler geldiğinde burada görünür; e-posta ile de haber verilir." : "Diğer sekmelerden talep geçmişini inceleyebilirsiniz."}</p></div> : <div className="overflow-x-auto" aria-busy={isFetching}><Table className="min-w-[900px]"><TableHeader><TableRow className="bg-mist/40"><TableHead className="pl-5">Öğrenci / sipariş</TableHead><TableHead>Eğitim ve talep</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Durum</TableHead><TableHead className="pr-5 text-right">İşlem</TableHead></TableRow></TableHeader><TableBody>{data.items.map(row => <TableRow key={row.id}>
        <TableCell className="py-5 pl-5 align-top"><p className="font-semibold">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{row.email}</p><p className="mt-2 font-mono text-xs">#{row.orderId}</p></TableCell>
        <TableCell className="max-w-xs py-5 align-top"><Link href={`/yonetim/egitimler/${row.courseId}`} className="font-medium text-forest hover:underline">{row.course}</Link><details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Talep nedenini oku</summary><p className="mt-2 max-w-xs whitespace-pre-wrap break-words">{row.reason}</p>{row.ownerNote && <p className="mt-3 border-l-2 border-forest/20 pl-3 text-muted-foreground">Yanıt: {row.ownerNote}</p>}</details></TableCell>
        <TableCell className="whitespace-nowrap py-5 align-top text-xs">{dateTimeLabel.format(new Date(row.at))}{row.decidedAt && <p className="mt-2 text-muted-foreground">Karar: {dateTimeLabel.format(new Date(row.decidedAt))}</p>}</TableCell>
        <TableCell className="whitespace-nowrap py-5 text-right align-top font-semibold tabular-nums">{formatMoney(row.refundAmountKurus ?? row.amountKurus, row.currency)}<p className="mt-1 text-xs font-normal text-muted-foreground">Ödenen {formatMoney(row.amountKurus, row.currency)}</p></TableCell>
        <TableCell className="py-5 align-top"><Badge variant={row.status === "pending" ? "outline" : "secondary"}>{statusLabel(row)}</Badge>{row.status === "approved" && !row.completed && <p className="mt-2 max-w-36 text-xs text-muted-foreground">{row.shopierRefundId ? "Tamamlanması Shopier tarafından bildirilir." : "Yeniden iade göndermeden önce kontrol edin."}</p>}</TableCell>
        <TableCell className="py-5 pr-5 align-top"><div className="flex justify-end gap-2">{row.status === "pending" ? <><Button size="sm" className="gap-1.5" onClick={() => setDecision({ request: row, approve: true })}><Check className="size-3.5" />Onayla</Button><Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDecision({ request: row, approve: false })}><X className="size-3.5" />Reddet</Button></> : row.status === "approved" && <a href="https://www.shopier.com/m/refunds.php" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-forest underline underline-offset-4">Shopier’de kontrol et<ArrowUpRight className="size-3.5" /></a>}</div></TableCell>
      </TableRow>)}</TableBody></Table></div>}
      {data && <div className="flex items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground"><p aria-live="polite">{data.total} talep · Sayfa {page} / {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}>Önceki</Button><Button variant="outline" size="sm" disabled={page >= pages || isFetching} onClick={() => setPage(page + 1)}>Sonraki</Button></div></div>}
    </div>
    <Dialog open={!!decision} onOpenChange={open => { if (!open) setDecision(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{decision?.approve ? "İadeyi onayla" : "Talebi reddet"}</DialogTitle><DialogDescription>{decision && `${decision.request.name} · Sipariş #${decision.request.orderId}`}</DialogDescription></DialogHeader>{decision && <><div className="rounded-xl bg-mist p-4 text-sm"><p className="font-medium">Talep nedeni</p><p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{decision.request.reason}</p></div><RefundDecisionForm key={`${decision.request.id}-${decision.approve}`} request={decision.request} approve={decision.approve} onDone={() => setDecision(null)} /></>}</DialogContent></Dialog>
  </>;
}
