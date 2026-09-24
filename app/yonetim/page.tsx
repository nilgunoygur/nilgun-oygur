import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Megaphone, ShoppingBag, Users } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { DashboardDatePicker } from "@/components/dashboard-date-picker";
import { OwnerRecentTransactions } from "@/components/owner-recent-transactions";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageWidth, ownerKicker, ownerPanel, ownerSection, ownerTitle } from "@/lib/styles";
import { formatMoney, shortDate } from "@/lib/akademi/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Yönetim paneli" };
type Search = Promise<{ period?: string; from?: string; to?: string }>;
const shortMonth = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit", timeZone: "UTC" });
const axisLabel = (unit: string, key: string) =>
  unit === "day" ? shortDate.format(new Date(`${key}T12:00:00+03:00`)) : unit === "month" ? shortMonth.format(new Date(`${key}-01T12:00:00Z`)) : key;

export default function OwnerPage({ searchParams }: { searchParams: Search }) {
  return <section className={cn(pageWidth, ownerSection)}>
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spinner className="size-6 text-forest" aria-label="Yönetim paneli yükleniyor" /></div>}><Dashboard searchParams={searchParams} /></Suspense>
  </section>;
}

async function Dashboard({ searchParams }: { searchParams: Search }) {
  await ownerPage();
  const { range, data, chart } = await akademi().owner.overview.read(await searchParams);
  const primaryRevenue = data.revenue.find(item => item.currency === "TRY");
  const otherRevenue = data.revenue.filter(item => item.currency !== "TRY");
  const max = Math.max(1, ...chart.points.map(item => item.amount));
  const periodName = { week: "Bu hafta", month: "Bu ay", year: "Bu yıl", custom: "Özel aralık" }[range.period];
  return <>
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div><p className={ownerKicker}>AKADEMİ YÖNETİMİ</p><h1 className={ownerTitle}>Genel bakış</h1><p className="mt-2 text-[16px] text-stone">Hesaplar, satışlar ve içerikler tek yerde.</p></div>
      <DashboardDatePicker period={range.period} from={range.from} to={range.to} today={range.today} />
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Users />} label="Toplam kullanıcı" value={data.totalUsers.toLocaleString("tr-TR")} detail={`Seçilen dönemde ${data.newUsers.toLocaleString("tr-TR")} yeni kayıt`} />
      <Metric icon={<ShoppingBag />} label="Sipariş" value={data.orders.toLocaleString("tr-TR")} detail={`${data.items.toLocaleString("tr-TR")} eğitim satışı`} />
      <Metric icon={<ShoppingBag />} label="Brüt satış" value={formatMoney(primaryRevenue?.amount ?? 0, "TRY")} detail={otherRevenue.length ? `Diğer para birimleri: ${otherRevenue.map(item => formatMoney(item.amount, item.currency)).join(" · ")}` : periodName} />
      <Metric icon={<Users />} label="Yeni kullanıcı" value={data.newUsers.toLocaleString("tr-TR")} detail={`${periodName.toLocaleLowerCase("tr-TR")} kayıt olanlar`} />
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <Card className={ownerPanel}>
        <CardHeader><p className="text-[12px] font-semibold tracking-[0.14em] text-primary">SATIŞ AKIŞI</p><CardTitle className="mt-2 text-[26px]">{{ day: "Günlük", month: "Aylık", year: "Yıllık" }[chart.unit]} gelir</CardTitle></CardHeader>
        <CardContent>
        {data.activity.length ? <div className="mt-9 flex h-[230px] items-end gap-1.5 border-b border-forest/15 pb-0.5" aria-label="Türk lirası satış geliri grafiği">{chart.points.map((item, index) => <div key={item.day} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${item.day}: ${formatMoney(item.amount, "TRY")} · ${item.orders} sipariş`}><div className={cn("w-full max-w-12 rounded-t-lg transition-colors group-hover:bg-forest", item.amount ? "bg-mint" : "bg-mist")} style={{ height: `${Math.max(5, item.amount / max * 195)}px` }} />{index % Math.ceil(chart.points.length / 7) === 0 && <span className="absolute top-[calc(100%+8px)] text-[10px] text-stone max-sm:hidden">{axisLabel(chart.unit, item.day)}</span>}</div>)}</div> : <div className="mt-8 flex h-[230px] items-center justify-center rounded-2xl bg-mist/60 text-[14px] text-stone">Bu dönemde henüz satış yok.</div>}
        <p className="mt-8 text-[12px] text-stone">Grafik, kaydedilmiş TRY Shopier eğitim satın alımlarını gösterir.</p>
        </CardContent>
      </Card>
      <Card className="rounded-[26px] bg-forest py-6 text-white sm:py-8"><CardHeader><p className="text-[12px] font-semibold tracking-[0.14em] text-lime">YÖNETİM</p><CardTitle className="mt-2 text-[26px] text-white">Hızlı erişim</CardTitle></CardHeader><CardContent className="mt-5 grid gap-3"><QuickLink href="/yonetim/egitimler" icon={<BookOpen />} title="Eğitimler ve satışlar" subtitle="Kursları ve siparişleri yönetin" /><QuickLink href="/yonetim/yazilar" icon={<FileText />} title="Yazılarım" subtitle="Yazıları düzenleyin ve yayınlayın" /><QuickLink href="/yonetim/banner" icon={<Megaphone />} title="Banner yönetimi" subtitle="Duyuruları düzenleyin ve yayınlayın" /></CardContent></Card>
    </div>

    <Card className={cn(ownerPanel, "mt-5")}><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-semibold tracking-[0.14em] text-primary">SON İŞLEMLER</p><CardTitle className="mt-2 text-[26px]">Son satışlar ve iadeler</CardTitle></div><Link href="/yonetim/egitimler" className="inline-flex items-center gap-2 text-[13px] font-semibold text-forest hover:underline">Eğitimleri yönet <ArrowRight className="size-4" /></Link></CardHeader>
      <CardContent><OwnerRecentTransactions from={range.from} to={range.to} /></CardContent>
    </Card>
  </>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="rounded-[24px] border-forest/10 bg-white py-6 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)]"><CardContent><div className="flex size-10 items-center justify-center rounded-2xl bg-mist text-forest [&_svg]:size-5">{icon}</div><p className="mt-6 text-[13px] font-medium text-stone">{label}</p><strong className="mt-2 block text-[clamp(25px,2.5vw,36px)] font-semibold leading-tight tracking-tight text-forest">{value}</strong><p className="mt-3 text-[12px] text-stone">{detail}</p></CardContent></Card>;
}
function QuickLink({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 transition-colors hover:bg-white/20"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 [&_svg]:size-5">{icon}</span><span className="min-w-0 flex-1"><strong className="block text-[14px]">{title}</strong><small className="mt-1 block text-[11px] text-white/70">{subtitle}</small></span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>;
}
