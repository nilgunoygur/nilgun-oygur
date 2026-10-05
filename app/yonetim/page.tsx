import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Megaphone, ShoppingBag, Undo2, Users, Wallet } from "lucide-react";
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
const fullDay = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const fullMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const pointLabel = (unit: string, key: string) =>
  unit === "day" ? fullDay.format(new Date(`${key}T12:00:00+03:00`)) : unit === "month" ? fullMonth.format(new Date(`${key}-01T12:00:00Z`)) : key;
const refundBar = "bg-[#d98a78]";
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
  const gross = primaryRevenue?.amount ?? 0, refunded = data.refunds.amount;
  const max = Math.max(1, ...chart.points.flatMap(item => [item.amount, item.refunded]));
  const barHeight = (amount: number) => `${Math.max(5, amount / max * 195)}px`;
  const periodName = { week: "Bu hafta", month: "Bu ay", year: "Bu yıl", custom: "Özel aralık" }[range.period];
  return <>
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div><p className={ownerKicker}>AKADEMİ YÖNETİMİ</p><h1 className={ownerTitle}>Genel bakış</h1><p className="mt-2 text-[16px] text-stone">Hesaplar, satışlar ve içerikler tek yerde.</p></div>
      <DashboardDatePicker period={range.period} from={range.from} to={range.to} today={range.today} />
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Wallet />} label="Net gelir" value={formatMoney(gross - refunded, "TRY")} detail={`Brüt ${formatMoney(gross, "TRY")} · İade ${formatMoney(refunded, "TRY")}${otherRevenue.length ? ` · Diğer: ${otherRevenue.map(item => formatMoney(item.amount, item.currency)).join(" · ")}` : ""}`} />
      <Metric icon={<ShoppingBag />} label="Sipariş" value={data.orders.toLocaleString("tr-TR")} detail={`${data.items.toLocaleString("tr-TR")} eğitim satışı · ${periodName.toLocaleLowerCase("tr-TR")}`} />
      <Metric icon={<Undo2 />} label="İadeler" value={formatMoney(refunded, "TRY")} detail={`${data.refunds.count.toLocaleString("tr-TR")} iade tamamlandı · ${data.pendingRefunds.toLocaleString("tr-TR")} talep karar bekliyor`} />
      <Metric icon={<Users />} label="Kullanıcılar" value={data.totalUsers.toLocaleString("tr-TR")} detail={`Seçilen dönemde ${data.newUsers.toLocaleString("tr-TR")} yeni kayıt`} />
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <Card className={ownerPanel}>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div><p className="text-[12px] font-semibold tracking-[0.14em] text-primary">SATIŞ AKIŞI</p><CardTitle className="mt-2 text-[26px]">{{ day: "Günlük", month: "Aylık", year: "Yıllık" }[chart.unit]} gelir ve iadeler</CardTitle></div>
          <ul className="flex gap-4 text-[12px] text-stone"><li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-mint" />Satış</li><li className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", refundBar)} />İade</li></ul>
        </CardHeader>
        <CardContent>
        {data.activity.length || data.refundActivity.length ? <div className="mt-9 flex h-[230px] items-end gap-1.5 border-b border-forest/15 pb-0.5" role="list" aria-label="Türk lirası satış ve iade grafiği">{chart.points.map((item, index) => {
          const label = pointLabel(chart.unit, item.day);
          // Hover or keyboard focus opens the figures; the edge columns anchor theirs inside the card.
          return <div key={item.day} role="listitem" tabIndex={0} aria-label={`${label}: satış ${formatMoney(item.amount, "TRY")}, ${item.orders} sipariş, iade ${formatMoney(item.refunded, "TRY")}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-t-lg outline-none hover:bg-mist/50 focus-visible:bg-mist/50">
            <div className={cn("w-full max-w-10 rounded-t-lg transition-colors group-hover:bg-forest group-focus-visible:bg-forest", item.amount ? "bg-mint" : "bg-mist")} style={{ height: barHeight(item.amount) }} />
            {item.refunded > 0 && <div className={cn("w-full max-w-10 rounded-t-lg", refundBar)} style={{ height: barHeight(item.refunded) }} />}
            <div role="tooltip" className={cn("pointer-events-none absolute bottom-[calc(100%+6px)] z-10 hidden w-max rounded-xl bg-forest px-3.5 py-2.5 text-[12px] leading-[1.6] text-white shadow-lg group-hover:block group-focus-visible:block", index < 2 ? "left-0" : index > chart.points.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2")}>
              <strong className="block text-[13px]">{label}</strong>
              <span className="block">Satış: {formatMoney(item.amount, "TRY")} · {item.orders} sipariş</span>
              <span className="block">İade: {formatMoney(item.refunded, "TRY")}</span>
              <span className="block font-semibold text-lime">Net: {formatMoney(item.amount - item.refunded, "TRY")}</span>
            </div>
            {index % Math.ceil(chart.points.length / 7) === 0 && <span className="absolute top-[calc(100%+8px)] text-[10px] text-stone max-sm:hidden">{axisLabel(chart.unit, item.day)}</span>}
          </div>;
        })}</div> : <div className="mt-8 flex h-[230px] items-center justify-center rounded-2xl bg-mist/60 text-[14px] text-stone">Bu dönemde henüz satış veya iade yok.</div>}
        <p className="mt-8 text-[12px] text-stone">Kaydedilmiş TRY eğitim satışları ve Shopier’in tamamladığı iadeler. Tutarları görmek için bir sütunun üzerine gelin.</p>
        </CardContent>
      </Card>
      <Card className="rounded-[26px] bg-forest py-6 text-white sm:py-8"><CardHeader><p className="text-[12px] font-semibold tracking-[0.14em] text-lime">YÖNETİM</p><CardTitle className="mt-2 text-[26px] text-white">Hızlı erişim</CardTitle></CardHeader><CardContent className="mt-5 grid gap-3"><QuickLink href="/yonetim/egitimler" icon={<BookOpen />} title="Eğitimler ve satışlar" subtitle="Kursları ve siparişleri yönetin" /><QuickLink href="/yonetim/iadeler" icon={<Undo2 />} title="İade talepleri" subtitle={data.pendingRefunds ? `${data.pendingRefunds.toLocaleString("tr-TR")} talep kararınızı bekliyor` : "Bekleyen talep yok"} /><QuickLink href="/yonetim/kullanicilar" icon={<Users />} title="Kullanıcılar" subtitle="Yöneticileri ve öğrencileri görün" /><QuickLink href="/yonetim/yazilar" icon={<FileText />} title="Yazılarım" subtitle="Yazıları düzenleyin ve yayınlayın" /><QuickLink href="/yonetim/banner" icon={<Megaphone />} title="Banner yönetimi" subtitle="Duyuruları düzenleyin ve yayınlayın" /></CardContent></Card>
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
