"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpen, ExternalLink, MoreHorizontal, Pencil, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { setAccessDuration, setCourseStatus, syncCatalogNow, updateCoursePrice } from "@/app/yonetim/egitimler/actions";
import { formatPrice } from "@/lib/akademi/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Course = { id: string; slug: string; productId: string; title: string; priceKurus: number | null; discounted: boolean; accessDurationDays: number; sales: number; claimed: number; status: "published" | "draft" | "archived" };
type Filter = "published" | "inactive" | "all";
type Edit = { kind: "price" | "access"; course: Course } | null;
const perPage = 6;
const statusLabel = { published: "Yayında", draft: "Taslak", archived: "Arşivde" } as const;
const queryKey = ["owner", "courses", "catalog"] as const;

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

export function OwnerCourseTable({ initialCourses }: { initialCourses: Course[] }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<Filter>("published");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Edit>(null);
  const { data, isFetching, isError } = useQuery<{ courses: Course[] }>({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/yonetim/courses", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Eğitimler yenilenemedi.");
      return response.json() as Promise<{ courses: Course[] }>;
    },
    initialData: { courses: initialCourses },
  });
  const refresh = () => client.invalidateQueries({ queryKey });
  const status = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Course["status"] }) => setCourseStatus(formData({ courseId: id, status: next })),
    onMutate: async ({ id, next }) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<{ courses: Course[] }>(queryKey);
      client.setQueryData<{ courses: Course[] }>(queryKey, current => current && ({ ...current, courses: current.courses.map(course => course.id === id ? { ...course, status: next } : course) }));
      return { previous };
    },
    onError: (_error, _variables, context) => { if (context?.previous) client.setQueryData(queryKey, context.previous); toast.error("Eğitim durumu güncellenemedi."); },
    onSuccess: () => toast.success("Eğitim durumu güncellendi."),
    onSettled: refresh,
  });
  const sync = useMutation({ mutationFn: syncCatalogNow, onSuccess: () => toast.success("Shopier ürünleri eşitlendi."), onSettled: refresh, onError: () => toast.error("Shopier eşitlemesi başarısız oldu.") });
  const edit = useMutation({ mutationFn: ({ kind, course, value }: { kind: "price" | "access"; course: Course; value: string }) =>
    kind === "price" ? updateCoursePrice(formData({ courseId: course.id, price: value })) : setAccessDuration(formData({ courseId: course.id, accessDays: value })),
  onSuccess: () => { setEditing(null); toast.success("Değişiklik kaydedildi."); }, onSettled: refresh, onError: (error) => toast.error(error instanceof Error ? error.message : "Değişiklik kaydedilemedi.") });

  const courses = data.courses;
  const published = courses.filter(item => item.status === "published").length;
  const counts = { published, inactive: courses.length - published, all: courses.length };
  const matching = courses.filter(item => (tab === "all" || (tab === "inactive" ? item.status !== "published" : item.status === "published")) && `${item.title} ${item.slug}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR").trim()));
  const pages = Math.max(1, Math.ceil(matching.length / perPage));
  const currentPage = Math.min(page, pages);
  const visible = matching.slice((currentPage - 1) * perPage, currentPage * perPage);
  const changeTab = (value: string | number | null) => { if (value === "published" || value === "inactive" || value === "all") { setTab(value); setPage(1); } };

  return <Card className="border-forest/10 shadow-sm"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Eğitimler</CardTitle><CardDescription>Fiyatlar Shopier’den alınır. Dersler ve erişim burada yönetilir.</CardDescription></div><Button type="button" variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>{sync.isPending ? <Spinner /> : <RefreshCw />} Shopier ile eşitle</Button></CardHeader><CardContent>
    <Tabs value={tab} onValueChange={changeTab}>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><TabsList><TabsTrigger value="published">Yayında <Badge variant="secondary">{counts.published}</Badge></TabsTrigger><TabsTrigger value="inactive">Yayında değil <Badge variant="secondary">{counts.inactive}</Badge></TabsTrigger><TabsTrigger value="all">Tümü <Badge variant="secondary">{counts.all}</Badge></TabsTrigger></TabsList><div className="relative w-full sm:max-w-64"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Eğitim ara" placeholder="Eğitim ara…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div></div>
      <TabsContent value={tab}>
        {isError && <p className="mb-4 text-sm text-destructive">Güncel veriler yüklenemedi; son görülen liste gösteriliyor.</p>}
        {isFetching && <p className="sr-only" aria-live="polite">Eğitimler yenileniyor</p>}
        {visible.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{courses.length === 0 ? "Henüz eğitim yok. Shopier’de bir dijital ürün oluşturup eşitleyin." : "Bu görünümde eğitim bulunamadı."}</div> : <div className="overflow-x-auto rounded-xl border"><Table className="min-w-[720px]"><TableHeader><TableRow className="bg-muted/30"><TableHead className="w-[38%] pl-5">Eğitim</TableHead><TableHead>Fiyat ve erişim</TableHead><TableHead>Satış</TableHead><TableHead>Durum</TableHead><TableHead className="w-14 text-right"><span className="sr-only">İşlemler</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(course => <TableRow key={course.id} className="h-20"><TableCell className="pl-5"><Link href={`/yonetim/egitimler/${course.id}`} className="block font-semibold text-foreground hover:text-primary hover:underline">{course.title}</Link><span className="mt-1 block max-w-[320px] truncate text-xs text-muted-foreground">/akademi/{course.slug}</span></TableCell><TableCell><span className="block font-medium">{course.priceKurus ? formatPrice(course.priceKurus) : "Fiyat yok"}</span><span className="text-xs text-muted-foreground">{course.accessDurationDays} gün erişim</span></TableCell><TableCell><span className="block font-medium">{course.sales}</span>{course.sales - course.claimed > 0 && <span className="text-xs text-muted-foreground">{course.sales - course.claimed} hesap bekliyor</span>}</TableCell><TableCell><Badge variant={course.status === "published" ? "secondary" : "outline"}>{statusLabel[course.status]}</Badge></TableCell><TableCell className="pr-4 text-right"><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" />} aria-label={`${course.title} işlemleri`}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-52"><DropdownMenuGroup><DropdownMenuItem render={<Link href={`/yonetim/egitimler/${course.id}`} />}><BookOpen />Dersleri düzenle</DropdownMenuItem><DropdownMenuItem onClick={() => setEditing({ kind: "access", course })}><SlidersHorizontal />Erişim süresi</DropdownMenuItem>{!course.discounted && course.priceKurus && <DropdownMenuItem onClick={() => setEditing({ kind: "price", course })}><Pencil />Fiyatı değiştir</DropdownMenuItem>}<DropdownMenuItem render={<a href={`https://www.shopier.com/${course.productId}`} target="_blank" rel="noopener noreferrer" />}><ExternalLink />Shopier’de aç</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>{course.status === "published" ? <DropdownMenuItem disabled={status.isPending} onClick={() => status.mutate({ id: course.id, next: "draft" })}>Yayından kaldır</DropdownMenuItem> : <DropdownMenuItem disabled={status.isPending} onClick={() => status.mutate({ id: course.id, next: "published" })}>Yayınla</DropdownMenuItem>}{course.status !== "archived" && <DropdownMenuItem disabled={status.isPending} onClick={() => status.mutate({ id: course.id, next: "archived" })}><Archive />Arşivle</DropdownMenuItem>}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div>}
      </TabsContent>
    </Tabs>
    {pages > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{matching.length} eğitim · Sayfa {currentPage}/{pages}</p><Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Önceki</Button></PaginationItem><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sonraki</Button></PaginationItem></PaginationContent></Pagination></div>}
  </CardContent>
  <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{editing?.kind === "price" ? "Shopier fiyatını değiştir" : "Erişim süresini değiştir"}</DialogTitle><DialogDescription>{editing?.course.title}</DialogDescription></DialogHeader>{editing && <form key={`${editing.kind}-${editing.course.id}`} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); edit.mutate({ kind: editing.kind, course: editing.course, value: String(data.get("value")) }); }}><FieldGroup><Field><FieldLabel htmlFor="course-setting">{editing.kind === "price" ? "Yeni fiyat (₺)" : "Erişim süresi (gün)"}</FieldLabel><Input id="course-setting" name="value" type="number" min={1} max={editing.kind === "price" ? 10000000 : 3650} step={editing.kind === "price" ? "0.01" : "1"} defaultValue={editing.kind === "price" ? ((editing.course.priceKurus ?? 0) / 100).toFixed(2) : editing.course.accessDurationDays} required autoFocus /><FieldDescription>{editing.kind === "price" ? "Fiyat Shopier ürününde güncellenir ve katalog yenilenir." : "Satın alanların eğitime erişim süresi."}</FieldDescription></Field></FieldGroup><DialogFooter className="mt-6"><Button type="submit" disabled={edit.isPending}>{edit.isPending ? <Spinner /> : null}Kaydet</Button></DialogFooter></form>}</DialogContent></Dialog>
  </Card>;
}
