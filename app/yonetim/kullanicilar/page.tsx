import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { dayLabel } from "@/lib/akademi/format";
import type { UserListParams, UserRole } from "@/lib/akademi/owner-users";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageWidth, backLink, ownerKicker, ownerPanel, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kullanıcılar" };
type SearchParams = Promise<UserListParams>;
type Filter = { role: UserRole | null; q: string; page: number };
const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

function usersHref(filter: Filter, changes: Partial<Filter>) {
  const next = { ...filter, ...changes };
  const params = new URLSearchParams();
  if (next.role) params.set("role", next.role);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/yonetim/kullanicilar?${query}` : "/yonetim/kullanicilar";
}

export default function OwnerUsers({ searchParams }: { searchParams: SearchParams }) {
  return <section className={cn(pageWidth, ownerSection)}>
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spinner className="size-6 text-forest" aria-label="Kullanıcılar yükleniyor" /></div>}><Users searchParams={searchParams} /></Suspense>
  </section>;
}

async function Users({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await ownerPage();
  const { filter, counts, matching, pages, users } = await akademi().owner.users(await searchParams);
  const tabs = [
    { role: null, label: "Tümü", count: counts.all },
    { role: "owner", label: "Yöneticiler", count: counts.owner },
    { role: "student", label: "Öğrenciler", count: counts.student },
  ] as const;

  return <>
    <Link href="/yonetim" className={backLink}><ArrowLeft className="size-4" /> Genel bakış</Link>
    <header className="mb-9"><p className={ownerKicker}>HESAP YÖNETİMİ</p><h1 className={ownerTitle}>Kullanıcılar</h1><p className="mt-2 text-[16px] text-stone">Kayıtlı hesapları, yöneticileri ve öğrencileri görün.</p></header>

    <Card className={ownerPanel}><CardContent>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Rol filtresi" className="inline-flex w-fit rounded-xl bg-mist p-1">
          {tabs.map(tab => {
            const active = tab.role === filter.role;
            return <Link key={tab.label} href={usersHref(filter, { role: tab.role, page: 1 })} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors", active ? "bg-white text-forest shadow-sm" : "text-stone hover:text-forest")}>
              {tab.label}<span className="text-xs text-muted-foreground">{tab.count.toLocaleString("tr-TR")}</span>
            </Link>;
          })}
        </nav>
        <Form action="/yonetim/kullanicilar" className="relative w-full sm:max-w-72">
          {filter.role && <input type="hidden" name="role" value={filter.role} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input key={filter.q} type="search" name="q" defaultValue={filter.q} aria-label="Ad veya e-posta ara" placeholder="Ad veya e-posta ara…" className="pl-9" />
        </Form>
      </div>

      {users.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {counts.all === 0 ? "Henüz kayıtlı kullanıcı yok." : "Bu filtreyle eşleşen kullanıcı bulunamadı."}
        {filter.q && <Link href={usersHref(filter, { q: "", page: 1 })} className="mt-3 block font-medium text-forest hover:underline">Aramayı temizle</Link>}
      </div> : <div className="overflow-x-auto rounded-xl border"><Table className="min-w-[760px]">
        <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-5">Kullanıcı</TableHead><TableHead>Rol</TableHead><TableHead>E-posta</TableHead><TableHead>Aktif eğitim</TableHead><TableHead>Kayıt</TableHead><TableHead className="pr-5">Son etkinlik</TableHead></TableRow></TableHeader>
        <TableBody>{users.map(item => <TableRow key={item.id} className="h-16">
          <TableCell className="pl-5"><div className="flex items-center gap-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-semibold text-forest">{(item.name || item.email).trim().charAt(0).toLocaleUpperCase("tr-TR")}</span>
            <div className="min-w-0"><span className="block max-w-[260px] truncate font-medium text-foreground">{item.name || item.email}{item.id === viewer.user.id && <span className="ml-1.5 text-xs font-normal text-primary">(siz)</span>}</span><span className="block max-w-[260px] truncate text-xs text-muted-foreground">{item.email}</span></div>
          </div></TableCell>
          <TableCell>{item.owner ? <Badge><ShieldCheck />Yönetici</Badge> : <Badge variant="outline">Öğrenci</Badge>}</TableCell>
          <TableCell><Badge variant={item.emailVerified ? "secondary" : "outline"}>{item.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}</Badge>{item.twoFactorEnabled && <span className="mt-1 block text-xs text-muted-foreground">Doğrulayıcı açık</span>}</TableCell>
          <TableCell>{item.activeCourses ? <span className="font-medium">{item.activeCourses}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
          <TableCell className="whitespace-nowrap text-stone">{dayLabel.format(item.createdAt)}</TableCell>
          <TableCell className="whitespace-nowrap pr-5 text-stone">{item.lastSeenAt ? dateTime.format(item.lastSeenAt) : "—"}</TableCell>
        </TableRow>)}</TableBody>
      </Table></div>}

      {pages > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{matching.toLocaleString("tr-TR")} kullanıcı · Sayfa {filter.page}/{pages}</p>
        <div className="flex gap-2">
          {filter.page > 1 ? <Link href={usersHref(filter, { page: filter.page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Önceki</Link> : <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>Önceki</span>}
          {filter.page < pages ? <Link href={usersHref(filter, { page: filter.page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Sonraki</Link> : <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>Sonraki</span>}
        </div>
      </div>}
      <p className="mt-5 text-[12px] text-stone">Yönetici yetkisi yalnızca veritabanındaki yönetici listesinden gelir; bu sayfadan değiştirilemez.</p>
    </CardContent></Card>
  </>;
}
