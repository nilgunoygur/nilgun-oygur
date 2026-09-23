import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Megaphone, ShoppingBag, Users } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { chartSeries, dashboardRange, ownerDashboard, recentShopierTransactions } from "@/lib/akademi/dashboard";
import { DashboardDatePicker } from "@/components/dashboard-date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Yönetim paneli" };
type Search = Promise<{ period?: string; from?: string; to?: string }>;
const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
const shortMonth = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit", timeZone: "UTC" });
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100); }
  catch { return `${(amount / 100).toLocaleString("tr-TR")} ${currency}`; }
};
const panel = "rounded-[26px] border-forest/10 bg-white py-6 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)] sm:py-8";

export default function OwnerPage({ searchParams }: { searchParams: Search }) {
  return <section className={cn(pageWidth, "min-h-[75vh] pt-[150px] pb-24 max-tablet:pt-[130px]")}>
    <Suspense fallback={<p className="text-stone">Panel yükleniyor…</p>}><Dashboard searchParams={searchParams} /></Suspense>
  </section>;
}

async function Dashboard({ searchParams }: { searchParams: Search }) {
  await ownerPage();
  const range = dashboardRange(await searchParams);
  const [data, transactions] = await Promise.all([ownerDashboard(range), recentShopierTransactions(range)]);
  const chart = chartSeries(range, data.activity);
  const primaryRevenue = data.revenue.find(item => item.currency === "TRY");
  const otherRevenue = data.revenue.filter(item => item.currency !== "TRY");
  const max = Math.max(1, ...chart.points.map(item => item.amount));
  const periodName = { week: "Bu hafta", month: "Bu ay", year: "Bu yıl", custom: "Özel aralık" }[range.period];
  return <>
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div><p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-forest">AKADEMİ YÖNETİMİ</p><h1 className="text-[clamp(38px,4vw,58px)]">Genel bakış</h1><p className="mt-2 text-[16px] text-stone">Hesaplar, satışlar ve içerikler tek yerde.</p></div>
      <DashboardDatePicker period={range.period} from={range.from} to={range.to} today={range.today} />
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Users />} label="Toplam kullanıcı" value={data.totalUsers.toLocaleString("tr-TR")} detail={`Seçilen dönemde ${data.newUsers.toLocaleString("tr-TR")} yeni kayıt`} />
      <Metric icon={<ShoppingBag />} label="Sipariş" value={data.orders.toLocaleString("tr-TR")} detail={`${data.items.toLocaleString("tr-TR")} eğitim satışı`} />
      <Metric icon={<ShoppingBag />} label="Brüt satış" value={money(primaryRevenue?.amount ?? 0, "TRY")} detail={otherRevenue.length ? `Diğer para birimleri: ${otherRevenue.map(item => money(item.amount, item.currency)).join(" · ")}` : periodName} />
      <Metric icon={<Users />} label="Yeni kullanıcı" value={data.newUsers.toLocaleString("tr-TR")} detail={`${periodName.toLocaleLowerCase("tr-TR")} kayıt olanlar`} />
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <Card className={panel}>
        <CardHeader><p className="text-[12px] font-semibold tracking-[0.14em] text-primary">SATIŞ AKIŞI</p><CardTitle className="mt-2 text-[26px]">{chart.unit === "day" ? "Günlük" : chart.unit === "month" ? "Aylık" : "Yıllık"} gelir</CardTitle></CardHeader>
        <CardContent>
        {data.activity.length ? <div className="mt-9 flex h-[230px] items-end gap-1.5 border-b border-forest/15 pb-0.5" aria-label="Türk lirası satış geliri grafiği">{chart.points.map((item, index) => <div key={item.day} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${item.day}: ${money(item.amount, "TRY")} · ${item.orders} sipariş`}><div className={cn("w-full max-w-12 rounded-t-lg transition-colors group-hover:bg-forest", item.amount ? "bg-mint" : "bg-mist")} style={{ height: `${Math.max(5, item.amount / max * 195)}px` }} />{index % Math.ceil(chart.points.length / 7) === 0 && <span className="absolute top-[calc(100%+8px)] text-[10px] text-stone max-sm:hidden">{chart.unit === "day" ? shortDate.format(new Date(`${item.day}T12:00:00+03:00`)) : chart.unit === "month" ? shortMonth.format(new Date(`${item.day}-01T12:00:00Z`)) : item.day}</span>}</div>)}</div> : <div className="mt-8 flex h-[230px] items-center justify-center rounded-2xl bg-mist/60 text-[14px] text-stone">Bu dönemde henüz satış yok.</div>}
        <p className="mt-8 text-[12px] text-stone">Grafik, kaydedilmiş TRY Shopier eğitim satın alımlarını gösterir.</p>
        </CardContent>
      </Card>
      <Card className="rounded-[26px] bg-forest py-6 text-white sm:py-8"><CardHeader><p className="text-[12px] font-semibold tracking-[0.14em] text-lime">YÖNETİM</p><CardTitle className="mt-2 text-[26px] text-white">Hızlı erişim</CardTitle></CardHeader><CardContent className="mt-5 grid gap-3"><QuickLink href="/yonetim/egitimler" icon={<BookOpen />} title="Eğitimler ve satışlar" subtitle="Kursları ve siparişleri yönetin" /><QuickLink href="/yonetim/yazilar" icon={<FileText />} title="Yazılarım" subtitle="Yazıları düzenleyin ve yayınlayın" /><QuickLink href="/yonetim/banner" icon={<Megaphone />} title="Banner yönetimi" subtitle="Duyuruları düzenleyin ve yayınlayın" /></CardContent></Card>
    </div>

    <Card className={cn(panel, "mt-5")}><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-semibold tracking-[0.14em] text-primary">SON İŞLEMLER</p><CardTitle className="mt-2 text-[26px]">Son satışlar ve iadeler</CardTitle></div><Link href="/yonetim/egitimler" className="inline-flex items-center gap-2 text-[13px] font-semibold text-forest hover:underline">Eğitimleri yönet <ArrowRight className="size-4" /></Link></CardHeader>
      <CardContent>{transactions.refundsUnavailable && !transactions.unavailable && <p className="mt-3 text-sm text-stone">İade bilgileri şu anda Shopier’den alınamıyor; satışlar gösteriliyor.</p>}{transactions.unavailable ? <p className="mt-6 text-[14px] text-stone">Shopier işlemleri şu anda yüklenemiyor.</p> : transactions.items.length ? <Table className="mt-5"><TableHeader><TableRow><TableHead>İşlem</TableHead><TableHead>Detay</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{transactions.items.map(item => <TableRow key={item.id}><TableCell><div className="flex items-center gap-2"><Badge variant={item.kind === "refund" ? "destructive" : "secondary"}>{item.kind === "refund" ? "İade" : "Satış"}</Badge><span className="font-medium">#{item.order}</span></div></TableCell><TableCell><span className="block max-w-[280px] truncate">{item.title}</span>{item.email && <span className="text-xs text-stone">{item.email}</span>}</TableCell><TableCell className="whitespace-nowrap text-stone">{shortDate.format(item.at)}</TableCell><TableCell className={cn("text-right font-semibold", item.kind === "refund" ? "text-destructive" : "text-forest")}>{money(item.amount, item.currency)}</TableCell></TableRow>)}</TableBody></Table> : <p className="mt-6 text-[14px] text-stone">Seçilen dönemde Shopier işlemi yok.</p>}</CardContent>
    </Card>
  </>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="rounded-[24px] border-forest/10 bg-white py-6 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)]"><CardContent><div className="flex size-10 items-center justify-center rounded-2xl bg-mist text-forest [&_svg]:size-5">{icon}</div><p className="mt-6 text-[13px] font-medium text-stone">{label}</p><strong className="mt-2 block text-[clamp(25px,2.5vw,36px)] font-semibold leading-tight tracking-tight text-forest">{value}</strong><p className="mt-3 text-[12px] text-stone">{detail}</p></CardContent></Card>;
}
function QuickLink({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 transition-colors hover:bg-white/20"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 [&_svg]:size-5">{icon}</span><span className="min-w-0 flex-1"><strong className="block text-[14px]">{title}</strong><small className="mt-1 block text-[11px] text-white/70">{subtitle}</small></span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>;
}
