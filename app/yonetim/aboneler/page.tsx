import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarPlus, Clock, Mail } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { defaultSubscriberPageSize, listSubscribers, subscriberPageSizes, subscriberSortColumns } from "@/lib/newsletter";
import { getSortingStateParser, parseColumnFilter } from "@/lib/data-table-parsers";
import { dayLabel } from "@/lib/akademi/format";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageLoader } from "@/components/ui/spinner";
import { pageWidth, ownerKicker, ownerPanel, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";
import { OwnerSubscribersTable } from "@/components/akademi/owner-subscribers-table";

export const metadata = { title: "Bülten aboneleri" };
type SearchParams = Promise<{ page?: string; perPage?: string; sort?: string; email?: string | string[] }>;
const sortParser = getSortingStateParser(subscriberSortColumns);

export default function OwnerSubscribers({ searchParams }: { searchParams: SearchParams }) {
  return <section className={cn(pageWidth, ownerSection)}>
    <Suspense fallback={<PageLoader label="Aboneler yükleniyor" />}><Subscribers searchParams={searchParams} /></Suspense>
  </section>;
}

async function Subscribers({ searchParams }: { searchParams: SearchParams }) {
  await ownerPage();
  // The table writes these keys to the URL; its own parsers read them back.
  const params = await searchParams;
  const search = parseColumnFilter("email", "text", [params.email].flat()[0] ?? "");
  const { page, pages, total, recent, latest, subscribers } = await listSubscribers(getDatabase(), {
    q: search.operator === "iLike" ? String(search.value) : "",
    page: Number(params.page), perPage: Number(params.perPage), sort: sortParser.parseServerSide(params.sort) ?? [],
  });
  // Keeps the table's page number true after the last row of the last page is deleted.
  if (Number(params.page) > page) redirect(`/yonetim/aboneler?${new URLSearchParams({ ...params, page: String(page) } as Record<string, string>)}`);

  return <>
    <OwnerBackLink />
    <header className="mb-9"><p className={ownerKicker}>BÜLTEN</p><h1 className={ownerTitle}>Bülten aboneleri</h1><p className="mt-2 text-[16px] text-stone">Sitenin altındaki formdan bültene kaydolan e-posta adresleri.</p></header>

    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat icon={<Mail />} label="Toplam abone" value={total.toLocaleString("tr-TR")} />
      <Stat icon={<CalendarPlus />} label="Son 30 günde" value={recent.toLocaleString("tr-TR")} />
      <Stat icon={<Clock />} label="Son kayıt" value={latest ? dayLabel.format(latest) : "—"} />
    </div>

    <Card className={ownerPanel}><CardContent>
      {total === 0 ? <Empty className="border border-dashed"><EmptyHeader>
        <EmptyMedia variant="icon"><Mail /></EmptyMedia>
        <EmptyTitle>Henüz bülten abonesi yok</EmptyTitle>
        <EmptyDescription>Ziyaretçiler sitenin altındaki formdan kaydoldukça burada listelenir.</EmptyDescription>
      </EmptyHeader></Empty> : <OwnerSubscribersTable subscribers={subscribers} pageCount={pages} pageSize={defaultSubscriberPageSize} pageSizes={subscriberPageSizes} />}
    </CardContent></Card>
  </>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-4 rounded-[20px] border border-forest/10 bg-white px-5 py-4">
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mist text-forest [&_svg]:size-5">{icon}</span>
    <div className="min-w-0"><p className="text-[13px] text-stone">{label}</p><p className="truncate text-[24px] leading-tight font-semibold text-forest">{value}</p></div>
  </div>;
}
