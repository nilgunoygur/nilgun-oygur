import { Suspense } from "react";
import Link from "next/link";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { formatPrice } from "@/lib/akademi/format";
import { setAccessDuration, setCourseStatus, syncCatalogNow } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

const ownerTable = "w-full border-collapse text-[15px] max-[861px]:block max-[861px]:overflow-x-auto [&_:is(th,td)]:border-b [&_:is(th,td)]:border-black/8 [&_:is(th,td)]:px-[10px] [&_:is(th,td)]:py-3 [&_:is(th,td)]:text-left [&_:is(th,td)]:align-top";

export const metadata = { title: "Eğitimler" };
const statusLabel = { draft: "Taslak", published: "Yayında", archived: "Arşivde" } as const;
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default function OwnerCourses() {
  return <section className={cn(pageWidth, accountPage)}>
    <Suspense fallback={<header className={accountHeader}><div><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Eğitimler ve satışlar</h1></div></header>}>
      <CoursesAndSales />
    </Suspense>
  </section>;
}

async function CoursesAndSales() {
  await ownerPage();
  const owner = akademi().owner;
  const [{ courses: rows, recentSales: recent }, attention] = await Promise.all([owner.catalog(), owner.needsAttention()]);
  return <>
    <header className={accountHeader}>
      <div><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Eğitimler ve satışlar</h1><p>Eğitimler Shopier mağazanızdan gelir: görünür, stokta olan dijital ürünler otomatik eklenir, silinenler kaldırılır. Başlık, görsel ve fiyatı Shopier’de düzenleyin.</p></div>
      <div className="flex flex-wrap items-center gap-4"><form action={syncCatalogNow}><Button size="pill">Shopier ile eşitle</Button></form><Link className="underline" href="/yonetim">Yönetim ana sayfası</Link></div>
    </header>
    <h2 className="mb-4 text-2xl">Eğitimler</h2>
    {rows.length === 0 ? <p>Henüz eğitim yok. Shopier’de görünür bir dijital ürün ekleyin.</p> : <table className={ownerTable}>
      <thead><tr><th>Eğitim</th><th>Fiyat</th><th>Erişim</th><th>Satış</th><th>Durum</th></tr></thead>
      <tbody>{rows.map(course => {
        return <tr key={course.id}>
          <td><strong>{course.title}</strong><br /><small>/akademi/{course.slug}</small><br /><a className="underline" href={`https://www.shopier.com/${course.productId}`} rel="noopener" target="_blank">Shopier ürünü</a></td>
          <td>{course.priceKurus ? formatPrice(course.priceKurus) : "—"}</td>
          <td><form action={setAccessDuration} className="flex items-center gap-2"><input type="hidden" name="courseId" value={course.id} /><Input className="h-7 w-20" name="accessDays" type="number" min={1} max={3650} defaultValue={course.accessDurationDays} aria-label="Erişim süresi (gün)" /><small>gün</small><Button size="sm" variant="outline">Kaydet</Button></form></td>
          <td>{course.sales}<br /><small>{course.sales - course.claimed} hesap bekliyor</small></td>
          <td>{statusLabel[course.status]}<form action={setCourseStatus} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="courseId" value={course.id} />
            {course.status !== "published" && <Button size="sm" name="status" value="published">Yayınla</Button>}
            {course.status === "published" && <Button size="sm" variant="outline" name="status" value="draft">Yayından kaldır</Button>}
            {course.status !== "archived" && <Button size="sm" variant="ghost" name="status" value="archived">Arşivle</Button>}
          </form></td>
        </tr>;
      })}</tbody>
    </table>}
    <h2 className="mb-4 mt-12 text-2xl">Son satışlar</h2>
    {recent.length === 0 ? <p>Henüz satış yok.</p> : <table className={ownerTable}>
      <thead><tr><th>Tarih</th><th>Eğitim</th><th>Alıcı</th><th>Tutar</th></tr></thead>
      <tbody>{recent.map(sale => <tr key={sale.id}><td>{date.format(sale.at)}<br /><small>#{sale.order}</small></td><td>{sale.title}</td><td>{sale.email}<br /><small>{sale.claimed ? "Hesaba eklendi" : "Hesap bekleniyor"}</small></td><td>{formatPrice(sale.amount)}</td></tr>)}</tbody>
    </table>}
    {attention.length > 0 && <>
      <h2 className="mb-4 mt-12 text-2xl">İlgilenilmesi gerekenler</h2>
      <p className="mb-4">Bu Shopier bildirimleri işlenemedi. Shopier yeniden dener; günlük eşitleme siparişleri ayrıca yeniden okur.</p>
      <table className={ownerTable}><thead><tr><th>Tarih</th><th>Bildirim</th><th>Deneme</th><th>Hata</th></tr></thead>
        <tbody>{attention.map(item => <tr key={item.eventIdentity}><td>{date.format(item.at)}</td><td>{item.eventIdentity}</td><td>{item.attempts}</td><td><small>{item.error}</small></td></tr>)}</tbody>
      </table>
    </>}
  </>;
}
