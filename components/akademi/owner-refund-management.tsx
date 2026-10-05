"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Check, RefreshCw, Search, Undo2, X } from "lucide-react";
import { ownerRefundQueryOptions, type OwnerRefundList } from "@/lib/akademi/owner-queries";
import type { RefundListParams } from "@/lib/akademi/owner-forms";
import { dateTimeLabel, formatMoney } from "@/lib/akademi/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefundDecisionForm } from "./refund-decision-form";

type Refund = OwnerRefundList["items"][number];
const filters: { value: RefundListParams["status"]; label: string }[] = [{ value: "pending", label: "Karar bekleyen" }, { value: "approved", label: "Onaylanan" }, { value: "declined", label: "Reddedilen" }, { value: "all", label: "Tümü" }];

function statusLabel(row: Refund) {
  if (row.status === "pending") return "Karar bekliyor";
  if (row.status === "declined") return "Reddedildi";
  if (row.completed) return "İade tamamlandı";
  return row.shopierRefundId ? "Shopier’e gönderildi" : "Shopier’de kontrol edin";
}

export function OwnerRefundManagement({ initialData }: { initialData: OwnerRefundList }) {
  const [status, setStatus] = useState<RefundListParams["status"]>("pending");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Refund | null>(null);
  const [decision, setDecision] = useState<"approve" | "decline" | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setFilter(search.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const { data, isFetching, isError, refetch } = useQuery(ownerRefundQueryOptions({ status, search: filter, page }, initialData));
  const counts = data?.counts ?? initialData.counts;
  const totalCount = counts.pending + counts.approved + counts.declined;
  const pages = data?.pages ?? 1;
  return <>
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {[{ label: "Kararınızı bekleyen", value: counts.pending, hint: "Öğrenci talepleri", accent: true }, { label: "Onaylanan talepler", value: counts.approved, hint: "Shopier’e gönderilen veya kontrol bekleyen" }, { label: "Reddedilen talepler", value: counts.declined, hint: "Karar geçmişi" }].map(item => <div key={item.label} className={cn("rounded-2xl border p-6", item.accent ? "border-forest bg-forest text-white" : "border-forest/10 bg-white")}><p className="text-sm font-medium">{item.label}</p><p className="my-3 text-4xl font-semibold tracking-tight tabular-nums">{item.value}</p><p className={cn("text-xs", item.accent ? "text-white/70" : "text-muted-foreground")}>{item.hint}</p></div>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <Tabs value={status} onValueChange={value => { const tab = filters.find(item => item.value === value); if (tab) { setStatus(tab.value); setPage(1); } }}><TabsList className="max-w-full flex-wrap group-data-horizontal/tabs:h-auto">{filters.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="h-auto px-3 py-2">{tab.label}<span className="ml-2 text-xs tabular-nums text-muted-foreground">{tab.value === "all" ? totalCount : counts[tab.value]}</span></TabsTrigger>)}</TabsList></Tabs>
        <div className="flex w-full items-center gap-2 sm:w-auto"><div className="relative flex-1"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Öğrenci, e-posta veya sipariş ara" aria-label="İade talebi ara" maxLength={100} className="w-full pl-9 sm:w-72" /></div><Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Talepleri yenile"><RefreshCw className={cn("size-4", isFetching && "animate-spin")} /></Button></div>
      </div>
      {isError ? <div role="alert" className="p-8 text-sm text-destructive">İade talepleri yüklenemedi. Yenile düğmesiyle tekrar deneyin.</div> : !data ? <div className="flex justify-center p-12 text-forest"><Spinner size={28} aria-label="Talepler yükleniyor" /></div> : data.items.length === 0 ? <Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><Undo2 /></EmptyMedia><EmptyTitle>{filter ? "Eşleşen talep yok" : "Bu bölümde talep yok"}</EmptyTitle><EmptyDescription>{status === "pending" && !filter ? "Yeni talepler burada görünür ve e-posta ile bildirilir." : "Diğer sekmelerden talep geçmişini inceleyebilirsiniz."}</EmptyDescription></EmptyHeader></Empty> : <Table className="table-fixed" aria-busy={isFetching}>
        <TableHeader><TableRow><TableHead className="w-[42%] pl-5 sm:w-[24%]">Öğrenci</TableHead><TableHead className="hidden sm:table-cell sm:w-[30%]">Eğitim</TableHead><TableHead className="w-[23%] text-right sm:w-[12%]">Tutar</TableHead><TableHead className="hidden sm:table-cell sm:w-[20%]">Durum</TableHead><TableHead className="w-[35%] pr-5 text-right sm:w-[14%]"><span className="sr-only">İşlem</span></TableHead></TableRow></TableHeader>
        <TableBody>{data.items.map(row => <TableRow key={row.id}>
          <TableCell className="py-4 pl-5"><p className="truncate font-medium">{row.name}</p><p className="mt-1 truncate font-mono text-xs text-muted-foreground">#{row.orderId}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:hidden">{row.course}</p><p className="mt-2 text-xs text-muted-foreground sm:hidden">{statusLabel(row)}</p></TableCell>
          <TableCell className="hidden py-4 sm:table-cell"><p className="line-clamp-2 whitespace-normal font-medium">{row.course}</p></TableCell>
          <TableCell className="text-right tabular-nums">{formatMoney(row.refundAmountKurus ?? row.amountKurus, row.currency)}</TableCell>
          <TableCell className="hidden sm:table-cell"><Badge variant={row.status === "pending" ? "outline" : "secondary"}>{statusLabel(row)}</Badge></TableCell>
          <TableCell className="pr-5 text-right"><Button variant="outline" size="sm" onClick={() => { setSelected(row); setDecision(null); }} aria-label={`${row.name} için iade talebini incele`}>İncele</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>}
      {data && <div className="flex items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground"><p aria-live="polite">{data.total} talep · Sayfa {page} / {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}>Önceki</Button><Button variant="outline" size="sm" disabled={page >= pages || isFetching} onClick={() => setPage(page + 1)}>Sonraki</Button></div></div>}
    </div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setDecision(null); } }}>
      <DialogContent className="max-h-[90vh] gap-6 overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8"><DialogTitle className="leading-snug tracking-normal">{decision === "approve" ? "İadeyi onayla" : decision === "decline" ? "Talebi reddet" : "İade talebi"}</DialogTitle><DialogDescription>{selected && `${selected.name} · Sipariş #${selected.orderId}`}</DialogDescription></DialogHeader>
        {selected && <>
          {!decision && <><dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="col-span-2"><dt className="text-xs text-muted-foreground">Eğitim</dt><dd className="mt-1"><Link href={`/yonetim/egitimler/${selected.course}`} className="font-medium hover:underline">{selected.course}</Link></dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted-foreground">E-posta</dt><dd className="mt-1 break-all">{selected.email}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Ödenen tutar</dt><dd className="mt-1">{formatMoney(selected.amountKurus, selected.currency)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Talep tarihi</dt><dd className="mt-1">{dateTimeLabel.format(new Date(selected.at))}</dd></div>
            {selected.decidedAt && <><div><dt className="text-xs text-muted-foreground">Karar tarihi</dt><dd className="mt-1">{dateTimeLabel.format(new Date(selected.decidedAt))}</dd></div><div><dt className="text-xs text-muted-foreground">Durum</dt><dd className="mt-1">{statusLabel(selected)}</dd></div></>}
          </dl>
          <Alert><AlertTitle>Talep nedeni</AlertTitle><AlertDescription className="whitespace-pre-wrap break-words">{selected.reason}</AlertDescription></Alert>
          {selected.ownerNote && <Alert><AlertTitle>Öğrenciye yanıt</AlertTitle><AlertDescription className="whitespace-pre-wrap break-words">{selected.ownerNote}</AlertDescription></Alert>}</>}
          {selected.status === "pending" ? decision ? <><p className="font-medium">{selected.course}</p><Button variant="ghost" size="sm" className="w-fit" onClick={() => setDecision(null)}><ArrowLeft data-icon="inline-start" />Talep detaylarına dön</Button><RefundDecisionForm key={`${selected.id}-${decision}`} request={selected} approve={decision === "approve"} onDone={() => { setSelected(null); setDecision(null); }} /></> : <DialogFooter className="gap-3"><Button variant="outline" onClick={() => setDecision("decline")}><X data-icon="inline-start" />Reddet</Button><Button onClick={() => setDecision("approve")}><Check data-icon="inline-start" />Onayla</Button></DialogFooter> : selected.status === "approved" && <>
            {!selected.completed && <Alert><AlertTitle>{selected.shopierRefundId ? "Shopier işlemi devam ediyor" : "Shopier’de kontrol gerekiyor"}</AlertTitle><AlertDescription>{selected.shopierRefundId ? "Eğitim erişimi kaldırıldı. Ödeme iadesinin tamamlanması Shopier tarafından bildirilir." : "Yeni bir iade göndermeden önce Shopier’deki işlemi kontrol edin."}</AlertDescription></Alert>}
            <DialogFooter><a href="https://www.shopier.com/m/refunds.php" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline underline-offset-4">Shopier’de kontrol et<ArrowUpRight /></a></DialogFooter>
          </>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
