"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpen, ExternalLink, ImagePlus, MoreHorizontal, Pencil, Plus, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { dateTimeLabel, formatPrice, formatMoney } from "@/lib/akademi/format";
import { createOwnerCourse, ownerCatalogQueryOptions, ownerQueryKeys, syncOwnerCatalog, updateOwnerCourse, updateOwnerProduct, type OwnerCatalogSnapshot, type OwnerCourse, type ProductValues } from "@/lib/akademi/owner-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLinkItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courseAccessSchema, coverRules, productFormSchema, productKeys, type CourseChange } from "@/lib/akademi/owner-forms";
import { CheckboxField, FileButton, FormMessage, FormShell, SubmitButton, TextField, TextareaField } from "./form-fields";

type Filter = "published" | "inactive" | "all";
type Edit = { kind: "access" | "product"; course: OwnerCourse } | { kind: "create" } | null;
const perPage = 6;
const statusLabel = { published: "Yayında", draft: "Taslak", archived: "Arşivde" } as const;
const blockerLabel = { missing: "Shopier ürünü bulunamadı.", notDigital: "Shopier ürünü dijital değil.", outOfStock: "ürün satışa kapalı.", unpriced: "ürünün geçerli bir ₺ fiyatı yok." } as const;

export function OwnerCourseManagement({ initialData, filesConfigured }: { initialData: OwnerCatalogSnapshot; filesConfigured: boolean }) {
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
      const patch = change.kind === "status" ? { status: change.status } : { accessDurationDays: change.value };
      client.setQueryData<OwnerCatalogSnapshot>(queryKey, current => current && { ...current, courses: current.courses.map(item => item.id === course.id ? { ...item, ...patch } : item) });
      return { previous };
    },
    onError: (error, _variables, context) => { if (context?.previous) client.setQueryData(queryKey, context.previous); toast.error(error.message); },
    onSuccess: (_data, { change }) => { setEditing(null); toast.success(change.kind === "status" ? "Eğitim durumu güncellendi." : "Değişiklik kaydedildi."); },
    onSettled: (_data, error) => error ? invalidate() : undefined,
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
      {data.refundReviews.length > 0 && <Card className="mb-6 border-amber-300"><CardHeader><CardTitle>Kısmi iadeleri inceleyin</CardTitle><CardDescription>Shopier kısmi iadelerde eğitim bilgisi göndermez. Öğrencinin hangi eğitime erişeceğini sipariş detaylarıyla kontrol edin; erişim otomatik kapatılmaz.</CardDescription></CardHeader><CardContent><ul className="grid gap-3">{data.refundReviews.map(refund => <li key={refund.id} className="text-sm">Sipariş {refund.orderId} · {formatMoney(refund.amountKurus, refund.currency)} · {dateTimeLabel.format(new Date(refund.at))}</li>)}</ul></CardContent></Card>}
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-forest/10 bg-white p-1 sm:w-fit">
        <TabsTrigger value="courses" className="px-4 py-2.5">Eğitimler <span className="ml-1 text-xs text-muted-foreground">{courses.length}</span></TabsTrigger>
        <TabsTrigger value="sales" className="px-4 py-2.5">Satışlar <span className="ml-1 text-xs text-muted-foreground">{data.recentSales.length}</span></TabsTrigger>
        {data.attention.length > 0 && <TabsTrigger value="attention" className="px-4 py-2.5">İşlem bekleyenler <span className="ml-1 text-xs text-destructive">{data.attention.length}</span></TabsTrigger>}
      </TabsList>

      <TabsContent value="courses">
        <Card className="border-forest/10 shadow-sm"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Eğitim kataloğu</CardTitle><CardDescription>Shopier fiyatı ve satışları, öğrenci erişimi ve ders programı.</CardDescription></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => setEditing({ kind: "create" })}><Plus /> Yeni eğitim</Button><Button type="button" variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>{sync.isPending ? <Spinner /> : <RefreshCw />} Shopier ile eşitle</Button></div></CardHeader><CardContent>
          {isError && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="status">Yenileme başarısız oldu. Son yüklenen veriler gösteriliyor.</p>}
          {isFetching && <p className="sr-only" aria-live="polite">Eğitim yönetimi verileri yenileniyor</p>}
          <Tabs value={tab} onValueChange={changeTab}>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><TabsList><TabsTrigger value="published">Yayında <Badge variant="secondary">{counts.published}</Badge></TabsTrigger><TabsTrigger value="inactive">Yayında değil <Badge variant="secondary">{counts.inactive}</Badge></TabsTrigger><TabsTrigger value="all">Tümü <Badge variant="secondary">{counts.all}</Badge></TabsTrigger></TabsList><div className="relative w-full sm:max-w-64"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Eğitim ara" placeholder="Eğitim ara…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div></div>
            <TabsContent value={tab}>
              {visible.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{courses.length === 0 ? "Henüz eğitim yok. “Yeni eğitim” ile oluşturun veya Shopier’deki dijital ürünlerinizi eşitleyin." : "Bu aramayla eşleşen eğitim bulunamadı."}</div> : <div className="overflow-x-auto rounded-xl border"><Table className="min-w-[720px]"><TableHeader><TableRow className="bg-muted/30"><TableHead className="w-[38%] pl-5">Eğitim</TableHead><TableHead>Fiyat ve erişim</TableHead><TableHead>Satış</TableHead><TableHead>Durum</TableHead><TableHead className="w-14 text-right"><span className="sr-only">İşlemler</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(course => <TableRow key={course.id} className="h-20"><TableCell className="pl-5"><Link href={`/yonetim/egitimler/${course.id}`} className="block font-semibold text-foreground hover:text-primary hover:underline">{course.title}</Link><span className="mt-1 block max-w-[320px] truncate text-xs text-muted-foreground">/akademi/{course.slug}</span></TableCell><TableCell><span className="block font-medium">{course.priceKurus ? formatPrice(course.priceKurus) : "Fiyat yok"}</span><span className="text-xs text-muted-foreground">{course.accessDurationDays} gün erişim</span></TableCell><TableCell><span className="block font-medium">{course.sales}</span>{course.sales - course.claimed > 0 && <span className="text-xs text-muted-foreground">{course.sales - course.claimed} hesap bekliyor</span>}</TableCell><TableCell><div className="flex w-fit items-center gap-2.5 text-sm font-medium"><Switch aria-label={`${course.title} yayında`} checked={course.status === "published"} disabled={savingId === course.id} onCheckedChange={checked => update.mutate({ course, change: { kind: "status", status: checked ? "published" : "draft" } })} />{statusLabel[course.status]}</div>{course.status === "published" && course.blocker && <span className="mt-1 block text-xs text-destructive">Sitede görünmüyor: {blockerLabel[course.blocker]}</span>}</TableCell><TableCell className="pr-4 text-right"><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" />} aria-label={`${course.title} işlemleri`}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-52"><DropdownMenuGroup><DropdownMenuLinkItem render={<Link href={`/yonetim/egitimler/${course.id}`} />}><BookOpen />Dersleri düzenle</DropdownMenuLinkItem><DropdownMenuItem onClick={() => setEditing({ kind: "access", course })}><SlidersHorizontal />Erişim süresi</DropdownMenuItem>{course.product && <DropdownMenuItem onClick={() => setEditing({ kind: "product", course })}><Pencil />Shopier ürününü düzenle</DropdownMenuItem>}<DropdownMenuLinkItem href={course.product?.url ?? `https://www.shopier.com/${course.productId}`} target="_blank" rel="noopener noreferrer"><ExternalLink />Shopier’de aç</DropdownMenuLinkItem></DropdownMenuGroup>{course.status !== "archived" && <><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem disabled={savingId === course.id} onClick={() => update.mutate({ course, change: { kind: "status", status: "archived" } })}><Archive />Arşivle</DropdownMenuItem></DropdownMenuGroup></>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div>}
            </TabsContent>
          </Tabs>
          {pages > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{matching.length} eğitim · Sayfa {currentPage}/{pages}</p><Pagination className="mx-0 w-auto"><PaginationContent><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Önceki</Button></PaginationItem><PaginationItem><Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sonraki</Button></PaginationItem></PaginationContent></Pagination></div>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="sales"><Card className="border-forest/10"><CardHeader><CardTitle>Son satışlar</CardTitle><CardDescription>Son 25 kaydedilmiş Shopier eğitim siparişi</CardDescription></CardHeader><CardContent>{data.recentSales.length === 0 ? <p className="text-sm text-muted-foreground">Henüz satış yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Eğitim</TableHead><TableHead>Alıcı</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{data.recentSales.map(sale => <TableRow key={sale.id}><TableCell className="whitespace-nowrap"><span className="block font-medium">{dateTimeLabel.format(new Date(sale.at))}</span><span className="text-xs text-muted-foreground">#{sale.order}</span></TableCell><TableCell>{sale.title}</TableCell><TableCell><span className="block">{sale.email}</span><Badge variant={sale.claimed ? "secondary" : "outline"}>{sale.claimed ? "Hesaba eklendi" : "Hesap bekliyor"}</Badge></TableCell><TableCell className="text-right font-medium">{formatPrice(sale.amount)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card></TabsContent>

      {data.attention.length > 0 && <TabsContent value="attention"><Card className="border-destructive/30"><CardHeader><CardTitle>İşlem bekleyen bildirimler</CardTitle><CardDescription>Yeniden işlenmesi veya incelenmesi gereken Shopier bildirimleri</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Bildirim</TableHead><TableHead>Deneme</TableHead><TableHead>Hata</TableHead></TableRow></TableHeader><TableBody>{data.attention.map(item => <TableRow key={item.eventIdentity}><TableCell>{dateTimeLabel.format(new Date(item.at))}</TableCell><TableCell>{item.eventIdentity}</TableCell><TableCell>{item.attempts}</TableCell><TableCell className="max-w-sm text-xs text-muted-foreground">{item.error ?? "Hata ayrıntısı yok"}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>}
    </Tabs>

    <Dialog open={editing?.kind === "access"} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Erişim süresini değiştir</DialogTitle><DialogDescription>{editing?.kind === "access" && editing.course.title}</DialogDescription></DialogHeader>{editing?.kind === "access" && <AccessForm key={editing.course.id} course={editing.course} onSave={value => update.mutateAsync({ course: editing.course, change: { kind: "access", value } }).catch(() => {})} />}</DialogContent></Dialog>

    <Dialog open={editing?.kind === "product" || editing?.kind === "create"} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{editing?.kind === "create" ? "Yeni eğitim" : "Shopier ürününü düzenle"}</DialogTitle><DialogDescription>{editing?.kind === "create" ? "Shopier’de dijital bir ürün oluşturulur ve sitede eğitim olarak eklenir." : "Değişiklikler Shopier’deki ürüne kaydedilir; sitedeki eğitim sayfası buradan beslenir."}</DialogDescription></DialogHeader>
      {(editing?.kind === "product" || editing?.kind === "create") && <ProductForm key={editing.kind === "product" ? editing.course.id : "new"} course={editing.kind === "product" ? editing.course : null} filesConfigured={filesConfigured}
        onSaved={created => { setEditing(null); if (created) { setTab("all"); setPage(1); } }} />}
    </DialogContent></Dialog>
  </>;
}

function AccessForm({ course, onSave }: { course: OwnerCourse; onSave: (value: number) => Promise<unknown> }) {
  const form = useForm({ resolver: zodResolver(courseAccessSchema), mode: "onTouched", defaultValues: { value: String(course.accessDurationDays) } });
  return <FormShell form={form} onSubmit={form.handleSubmit(({ value }) => onSave(value))}>
    <TextField control={form.control} name="value" label="Erişim süresi (gün)" type="number" inputMode="decimal" step="1" autoFocus description="Satın alanların eğitime erişim süresi." />
    <DialogFooter><SubmitButton>Kaydet</SubmitButton></DialogFooter>
  </FormShell>;
}

const lira = (kurus: number | null | undefined) => kurus ? (kurus / 100).toFixed(2).replace(/\.00$/, "") : "";

/** `course === null` creates a course; an edit sends only the fields that changed. */
function ProductForm({ course, filesConfigured, onSaved }: { course: OwnerCourse | null; filesConfigured: boolean; onSaved: (created: boolean) => void }) {
  const client = useQueryClient();
  const product = course?.product;
  const form = useForm({
    resolver: zodResolver(productFormSchema), mode: "onTouched",
    defaultValues: {
      title: course?.title ?? "", description: product?.description ?? "", price: lira(product?.listPriceKurus), discountedPrice: course?.discounted ? lira(course.priceKurus) : "",
      listed: !product?.hidden, inStock: product?.inStock ?? true, accessDays: "365", publish: false,
    },
  });
  const { dirtyFields } = useFormState({ control: form.control });
  // Read when saving: the compiler would memoize a list derived from this object during render.
  const changed = () => productKeys.filter(key => dirtyFields[key]);
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [imageError, setImageError] = useState("");
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.preview); }, [image]);
  const save = useMutation({
    mutationFn: (values: ProductValues) => course
      ? updateOwnerProduct(course.id, Object.fromEntries(changed().map(key => [key, values[key]])) as Partial<ProductValues>, image?.file ?? null)
      : createOwnerCourse(values, image?.file ?? null),
    onSuccess: () => { toast.success(course ? "Shopier ürünü güncellendi." : "Eğitim oluşturuldu. Şimdi derslerini ekleyebilirsiniz."); onSaved(!course); },
    onError: error => form.setError("root", { message: error.message }),
    // A write can reach Shopier before a later step fails, so the catalog is re-read either way.
    onSettled: () => client.invalidateQueries({ queryKey: ownerQueryKeys.catalog() }),
  });
  const submit = form.handleSubmit(values => {
    if (course && !image && !changed().length) { toast.info("Değişiklik yapılmadı."); onSaved(false); return; }
    return save.mutateAsync(values).catch(() => undefined);
  });
  const cover = image?.preview ?? product?.image;
  return <FormShell form={form} onSubmit={submit}>
    <TextField control={form.control} name="title" label="Eğitim adı" maxLength={150} autoFocus={!course} />
    <TextareaField control={form.control} name="description" label="Açıklama" rows={9} maxLength={20000} className="max-h-[40vh]"
      description="Her satır ayrı bir paragraf olur. Başlık için satıra ### ile başlayın, madde için - koyun, **kalın** yazmak için iki yıldız kullanın." />
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField control={form.control} name="price" label="Fiyat (₺)" type="number" inputMode="decimal" step="0.01" min={1} />
      <TextField control={form.control} name="discountedPrice" label="İndirimli fiyat (₺)" type="number" inputMode="decimal" step="0.01" min={1} description="İndirim yoksa boş bırakın." />
    </div>
    <div className="grid gap-2">
      <p className="text-sm font-medium">Kapak görseli</p>
      <div className="flex flex-wrap items-center gap-4">
        {cover ? <img src={cover} alt="" className="aspect-[4/3] w-32 shrink-0 rounded-lg border bg-muted object-cover" /> : <div className="flex aspect-[4/3] w-32 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground"><ImagePlus /></div>}
        <div className="grid gap-2">
          <FileButton variant="outline" size="sm" className="w-fit" disabled={!filesConfigured} accept={coverRules.types.join(",")} onFiles={([file]) => {
            const usable = coverRules.types.includes(file.type) && file.size <= coverRules.maxBytes;
            setImageError(usable ? "" : `Bu görsel kullanılamıyor. ${coverRules.hint}`);
            if (usable) setImage({ file, preview: URL.createObjectURL(file) });
          }}><ImagePlus /> {cover ? "Görseli değiştir" : "Görsel seç"}</FileButton>
          <p className="max-w-xs text-xs text-muted-foreground">{!filesConfigured ? `Görsel yüklemek için dosya depolama bağlantısı gerekir.${course ? "" : " Şimdilik akademinin varsayılan kapağı kullanılır."}` : `${coverRules.hint}${course ? " Ürünün mevcut görsellerinin yerini alır." : " Seçmezseniz akademinin varsayılan kapağı kullanılır."}`}</p>
        </div>
      </div>
      {imageError && <p role="alert" className="text-sm text-destructive">{imageError}</p>}
    </div>
    <CheckboxField control={form.control} name="listed" label="Shopier mağazasında listelensin" description="Kapalıyken ürün Shopier vitrininde görünmez. Sitedeki yayın durumunu değiştirmez." />
    {course ? <CheckboxField control={form.control} name="inStock" label="Satışa açık" description="Kapalıyken ürün Shopier’de tükendi görünür ve sitede satın alınamaz." />
      : <div className="grid gap-5 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
        <TextField control={form.control} name="accessDays" label="Erişim süresi (gün)" type="number" inputMode="numeric" step="1" min={1} className="bg-white" />
        <CheckboxField control={form.control} name="publish" label="Sitede hemen yayınla" description="Kapalıyken taslak olarak eklenir; derslerini hazırlayınca yayınlarsınız." className="sm:pt-6" />
      </div>}
    <FormMessage />
    <DialogFooter><SubmitButton>{course ? "Shopier’e kaydet" : "Eğitimi oluştur"}</SubmitButton></DialogFooter>
  </FormShell>;
}
