import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { listSubscribers, type SubscriberListParams } from "@/lib/newsletter";
import { dateTimeLabel } from "@/lib/akademi/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageWidth, ownerKicker, ownerPanel, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";

export const metadata = { title: "Bülten aboneleri" };
type SearchParams = Promise<SubscriberListParams>;
type Filter = { q: string; page: number };

function subscribersHref({ q, page }: Filter) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/yonetim/aboneler?${query}` : "/yonetim/aboneler";
}

export default function OwnerSubscribers({ searchParams }: { searchParams: SearchParams }) {
  return <section className={cn(pageWidth, ownerSection)}>
    <Suspense fallback={<PageLoader label="Aboneler yükleniyor" />}><Subscribers searchParams={searchParams} /></Suspense>
  </section>;
}

async function Subscribers({ searchParams }: { searchParams: SearchParams }) {
  await ownerPage();
  const { filter, total, matching, pages, subscribers } = await listSubscribers(getDatabase(), await searchParams);

  return <>
    <OwnerBackLink />
    <header className="mb-9"><p className={ownerKicker}>BÜLTEN</p><h1 className={ownerTitle}>Bülten aboneleri</h1><p className="mt-2 text-[16px] text-stone">Sitenin altındaki formdan bültene kaydolan e-posta adresleri.</p></header>

    <Card className={ownerPanel}><CardContent>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone"><span className="font-semibold text-forest">{total.toLocaleString("tr-TR")}</span> abone</p>
        <Form action="/yonetim/aboneler" className="relative w-full sm:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input key={filter.q} type="search" name="q" defaultValue={filter.q} aria-label="E-posta ara" placeholder="E-posta ara…" className="pl-9" />
        </Form>
      </div>

      {subscribers.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {total === 0 ? "Henüz bülten abonesi yok." : "Bu aramayla eşleşen abone bulunamadı."}
        {filter.q && <Link href={subscribersHref({ q: "", page: 1 })} className="mt-3 block font-medium text-forest hover:underline">Aramayı temizle</Link>}
      </div> : <div className="overflow-x-auto rounded-xl border"><Table>
        <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-5">E-posta</TableHead><TableHead className="pr-5">Kayıt</TableHead></TableRow></TableHeader>
        <TableBody>{subscribers.map(item => <TableRow key={item.id} className="h-14">
          <TableCell className="pl-5"><a href={`mailto:${item.email}`} className="font-medium text-foreground hover:text-forest hover:underline">{item.email}</a></TableCell>
          <TableCell className="whitespace-nowrap pr-5 text-stone">{dateTimeLabel.format(item.createdAt)}</TableCell>
        </TableRow>)}</TableBody>
      </Table></div>}

      {pages > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{matching.toLocaleString("tr-TR")} abone · Sayfa {filter.page}/{pages}</p>
        <div className="flex gap-2">
          <PageLink filter={filter} page={filter.page - 1} disabled={filter.page <= 1}>Önceki</PageLink>
          <PageLink filter={filter} page={filter.page + 1} disabled={filter.page >= pages}>Sonraki</PageLink>
        </div>
      </div>}
    </CardContent></Card>
  </>;
}

function PageLink({ filter, page, disabled, children }: { filter: Filter; page: number; disabled: boolean; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  return disabled ? <span aria-disabled className={cn(className, "pointer-events-none opacity-50")}>{children}</span> : <Link href={subscribersHref({ ...filter, page })} className={className}>{children}</Link>;
}
