"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpen, ExternalLink, MoreHorizontal, Pencil, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { dateTimeLabel, formatPrice } from "@/lib/akademi/format";
import { ownerCatalogQueryOptions, ownerQueryKeys, syncOwnerCatalog, updateOwnerCourse, type OwnerCatalogSnapshot, type OwnerCourse } from "@/lib/akademi/owner-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courseAccessSchema, coursePriceSchema, type CourseChange } from "@/lib/akademi/owner-forms";
import { FormShell, SubmitButton, TextField } from "./form-fields";

type Filter = "published" | "inactive" | "all";
type Edit = { kind: "price" | "access"; course: OwnerCourse } | null;
const perPage = 6;
const statusLabel = { published: "Yayında", draft: "Taslak", archived: "Arşivde" } as const;

export function OwnerCourseManagement({ initialData }: { initialData: OwnerCatalogSnapshot }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<Filter>("published");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Edit>(null);
  const { data, isFetching, isError } = useQuery(ownerCatalogQueryOptions(initialData));
  const queryKey = ownerQueryKeys.catalog();
  const invalidate = () => client.invalidateQueries({ queryKey });
  const update = useMutation({
    mutationFn: ({ course, change }: { course: OwnerCourse; change: CourseChange }) => updateOwnerCourse(course.id, change),
    onMutate: async ({ course, change }) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<OwnerCatalogSnapshot>(queryKey);
      const patch = change.kind === "status" ? { status: change.status } : change.kind === "price" ? { priceKurus: Math.round(change.value * 100) } : { accessDurationDays: change.value };
      client.setQueryData<OwnerCatalogSnapshot>(queryKey, current => current && { ...current, courses: current.courses.map(item => item.id === course.id ? { ...item, ...patch } : item) });
      return { previous };
    },
    onError: (error, _variables, context) => { if (context?.previous) client.setQueryData(queryKey, context.previous); toast.error(error.message); },
    onSuccess: (_data, { change }) => { setEditing(null); toast.success(change.kind === "status" ? "Eğitim durumu güncellendi." : "Değişiklik kaydedildi."); },
    // The patch is what the server writes; refetch only after a rollback or a price change (Shopier owns prices).
    onSettled: (_data, error, { change }) => error || change.kind === "price" ? invalidate() : undefined,
  });
  const savingId = update.isPending ? update.variables.course.id : null;
  const sync = useMutation({ mutationFn: syncOwnerCatalog, onSuccess: () => toast.success("Shopier ürünleri eşitlendi."), onError: error => toast.error(error.message), onSettled: invalidate });

  const courses = data.courses;
  const published = courses.filter(item => item.status === "published").length;
  const counts = { published, inactive: courses.length - published, all: courses.length };
  const matching = courses.filter(item => (tab === "all" || (tab === "inactive" ? item.status !== "published" : item.status === "published")) && `${item.title} ${item.slug}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR").trim()));
  const pages = Math.max(1, Math.ceil(matching.length / perPage));
  const currentPage = Math.min(page, pages);
  const visible = matching.slice((currentPage - 1) * perPage, currentPage * perPage);
  const changeTab = (value: string | number | null) => { if (value === "published" || value === "inactive" || value === "all") { setTab(value); setPage(1); } };

  return <>
    <Tabs defaultValue="courses" className="gap-5">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-forest/10 bg-white p-1 sm:w-fit">
        <TabsTrigger value="courses" className="px-4 py-2.5">Eğitimler <span className="ml-1 text-xs text-muted-foreground">{courses.length}</span></TabsTrigger>
        <TabsTrigger value="sales" className="px-4 py-2.5">Satışlar <span className="ml-1 text-xs text-muted-foreground">{data.recentSales.length}</span></TabsTrigger>
        {data.attention.length > 0 && <TabsTrigger value="attention" className="px-4 py-2.5">İşlem bekleyenler <span className="ml-1 text-xs text-destructive">{data.attention.length}</span></TabsTrigger>}
      </TabsList>

      <TabsContent value="courses">
        <Card className="border-forest/10 shadow-sm"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Eğitim kataloğu</CardTitle><CardDescription>Shopier fiyatı ve satışları, öğrenci erişimi ve ders programı.</CardDescription></div><Button type="button" variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>{sync.isPending ? <Spinner /> : <RefreshCw />} Shopier ile eşitle</Button></CardHeader><CardContent>
          {isError && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="status">Yenileme başarısız oldu. Son yüklenen veriler gösteriliyor.</p>}
          {isFetching && <p className="sr-only" aria-live="polite">Eğitim yönetimi verileri yenileniyor</p>}
          <Tabs value={tab} onValueChange={changeTab}>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><TabsList><TabsTrigger value="published">Yayında <Badge variant="secondary">{counts.published}</Badge></TabsTrigger><TabsTrigger value="inactive">Yayında değil <Badge variant="secondary">{counts.inactive}</Badge></TabsTrigger><TabsTrigger value="all">Tümü <Badge variant="secondary">{counts.all}</Badge></TabsTrigger></TabsList><div className="relative w-full sm:max-w-64"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Eğitim ara" placeholder="Eğitim ara…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div></div>
            <TabsContent value={tab}>
              {visible.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{courses.length === 0 ? "Henüz eğitim yok. Shopier’de dijital ürün oluşturup eşitleyin." : "Bu aramayla eşleşen eğitim bulunamadı."}</div> : <div className="overflow-x-auto rounded-xl border"><Table className="min-w-[720px]"><TableHeader><TableRow className="bg-muted/30"><TableHead className="w-[38%] pl-5">Eğitim</TableHead><TableHead>Fiyat ve erişim</TableHead><TableHead>Satış</TableHead><TableHead>Durum</TableHead><TableHead className="w-14 text-right"><span className="sr-only">İşlemler</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(course => <TableRow key={course.id} className="h-20"><TableCell className="pl-5"><Link href={`/yonetim/egitimler/${course.id}`} className="block font-semibold text-foreground hover:text-primary hover:underline">{course.title}</Link><span className="mt-1 block max-w-[320px] truncate text-xs text-muted-foreground">/akademi/{course.slug}</span></TableCell><TableCell><span className="block font-medium">{course.priceKurus ? formatPrice(course.priceKurus) : "Fiyat yok"}</span><span className="text-xs text-muted-foreground">{course.accessDurationDays} gün erişim</span></TableCell><TableCell><span className="block font-medium">{course.sales}</span>{course.sales - course.claimed > 0 && <span className="text-xs text-muted-foreground">{course.sales - course.claimed} hesap bekliyor</span>}</TableCell><TableCell><Badge variant={course.status === "published" ? "secondary" : "outline"}>{statusLabel[course.status]}</Badge></TableCell><TableCell className="pr-4 text-right"><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" />} aria-label={`${course.title} işlemleri`}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-52"><DropdownMenuGroup><DropdownMenuItem render={<Link href={`/yonetim/egitimler/${course.id}`} />}><BookOpen />Dersleri düzenle</DropdownMenuItem><DropdownMenuItem onClick={() => setEditing({ kind: "access", course })}><SlidersHorizontal />Erişim süresi</DropdownMenuItem>{!course.discounted && course.priceKurus && <DropdownMenuItem onClick={() => setEditing({ kind: "price", course })}><Pencil />Fiyatı değiştir</DropdownMenuItem>}<DropdownMenuItem render={<a href={`https://www.shopier.com/${course.productId}`} target="_blank" rel="noopener noreferrer" />}><ExternalLink />Shopier’de aç</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>{course.status === "published" ? <DropdownMenuItem disabled={savingId === course.id} onClick={() => update.mutate({ course, change: { kind: "status", status: "draft" } })}>Yayından kaldır</DropdownMenuItem> : <DropdownMenuItem disabled={savingId === course.id} onClick={() => update.mutate({ course, change: { kind: "status", status: "published" } })}>Yayınla</DropdownMenuItem>}{course.status !== "archived" && <DropdownMenuItem disabled={savingId === course.id} onClick={() => update.mutate({ course, change: { kind: "status", status: "archived" } })}><Archive />Arşivle</DropdownMenuItem>}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div>}
            </TabsContent>
          </Tabs>
          {pages > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{matching.length} eğitim · Sayfa {currentPage}/{pages}</p><Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Önceki</Button></PaginationItem><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sonraki</Button></PaginationItem></PaginationContent></Pagination></div>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="sales"><Card className="border-forest/10"><CardHeader><CardTitle>Son satışlar</CardTitle><CardDescription>Son 25 kaydedilmiş Shopier eğitim siparişi</CardDescription></CardHeader><CardContent>{data.recentSales.length === 0 ? <p className="text-sm text-muted-foreground">Henüz satış yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Eğitim</TableHead><TableHead>Alıcı</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{data.recentSales.map(sale => <TableRow key={sale.id}><TableCell className="whitespace-nowrap"><span className="block font-medium">{dateTimeLabel.format(new Date(sale.at))}</span><span className="text-xs text-muted-foreground">#{sale.order}</span></TableCell><TableCell>{sale.title}</TableCell><TableCell><span className="block">{sale.email}</span><Badge variant={sale.claimed ? "secondary" : "outline"}>{sale.claimed ? "Hesaba eklendi" : "Hesap bekliyor"}</Badge></TableCell><TableCell className="text-right font-medium">{formatPrice(sale.amount)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card></TabsContent>

      {data.attention.length > 0 && <TabsContent value="attention"><Card className="border-destructive/30"><CardHeader><CardTitle>İşlem bekleyen bildirimler</CardTitle><CardDescription>Yeniden işlenmesi veya incelenmesi gereken Shopier bildirimleri</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Bildirim</TableHead><TableHead>Deneme</TableHead><TableHead>Hata</TableHead></TableRow></TableHeader><TableBody>{data.attention.map(item => <TableRow key={item.eventIdentity}><TableCell>{dateTimeLabel.format(new Date(item.at))}</TableCell><TableCell>{item.eventIdentity}</TableCell><TableCell>{item.attempts}</TableCell><TableCell className="max-w-sm text-xs text-muted-foreground">{item.error ?? "Hata ayrıntısı yok"}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>}
    </Tabs>

    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{editing?.kind === "price" ? "Shopier fiyatını değiştir" : "Erişim süresini değiştir"}</DialogTitle><DialogDescription>{editing?.course.title}</DialogDescription></DialogHeader>{editing && <CourseSettingForm key={`${editing.kind}-${editing.course.id}`} kind={editing.kind} course={editing.course} onSave={value => update.mutateAsync({ course: editing.course, change: { kind: editing.kind, value } }).catch(() => {})} />}</DialogContent></Dialog>
  </>;
}

function CourseSettingForm({ kind, course, onSave }: { kind: "price" | "access"; course: OwnerCourse; onSave: (value: number) => Promise<unknown> }) {
  const price = kind === "price";
  const form = useForm({
    resolver: zodResolver(price ? coursePriceSchema : courseAccessSchema), mode: "onTouched",
    defaultValues: { value: price ? ((course.priceKurus ?? 0) / 100).toFixed(2) : String(course.accessDurationDays) },
  });
  return <FormShell form={form} onSubmit={form.handleSubmit(({ value }) => onSave(value))}>
    <TextField control={form.control} name="value" label={price ? "Yeni fiyat (₺)" : "Erişim süresi (gün)"} type="number" inputMode="decimal" step={price ? "0.01" : "1"} autoFocus
      description={price ? "Fiyat Shopier ürününde güncellenir ve katalog yenilenir." : "Satın alanların eğitime erişim süresi."} />
    <DialogFooter><SubmitButton>Kaydet</SubmitButton></DialogFooter>
  </FormShell>;
}
