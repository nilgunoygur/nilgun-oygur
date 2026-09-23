import { Suspense } from "react";
import Link from "next/link";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { formatPrice } from "@/lib/akademi/format";
import { setAccessDuration, setCourseStatus, syncCatalogNow } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

const ownerTable = "text-[15px] [&_td]:align-top [&_td]:whitespace-normal [&_td]:py-3";

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
    {rows.length === 0 ? <p>Henüz eğitim yok. Shopier’de görünür bir dijital ürün ekleyin.</p> : <Table className={ownerTable}>
      <TableHeader><TableRow><TableHead>Eğitim</TableHead><TableHead>Fiyat</TableHead><TableHead>Erişim</TableHead><TableHead>Satış</TableHead><TableHead>Durum</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map(course => {
        return <TableRow key={course.id}>
          <TableCell><strong>{course.title}</strong><br /><Link className="my-2 inline-block font-medium text-primary underline underline-offset-4" href={`/yonetim/egitimler/${course.id}`}>Ders içeriklerini düzenle →</Link><br /><small>/akademi/{course.slug}</small><br /><a className="underline" href={`https://www.shopier.com/${course.productId}`} rel="noopener" target="_blank">Shopier ürünü</a></TableCell>
          <TableCell>{course.priceKurus ? formatPrice(course.priceKurus) : "—"}</TableCell>
          <TableCell><form action={setAccessDuration} className="flex items-center gap-2"><input type="hidden" name="courseId" value={course.id} /><Input className="h-7 w-20" name="accessDays" type="number" min={1} max={3650} defaultValue={course.accessDurationDays} aria-label="Erişim süresi (gün)" /><small>gün</small><Button size="sm" variant="outline">Kaydet</Button></form></TableCell>
          <TableCell>{course.sales}<br /><small>{course.sales - course.claimed} hesap bekliyor</small></TableCell>
          <TableCell>{statusLabel[course.status]}<form action={setCourseStatus} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="courseId" value={course.id} />
            {course.status !== "published" && <Button size="sm" name="status" value="published">Yayınla</Button>}
            {course.status === "published" && <Button size="sm" variant="outline" name="status" value="draft">Yayından kaldır</Button>}
            {course.status !== "archived" && <Button size="sm" variant="ghost" name="status" value="archived">Arşivle</Button>}
          </form></TableCell>
        </TableRow>;
      })}</TableBody>
    </Table>}
    <h2 className="mb-4 mt-12 text-2xl">Son satışlar</h2>
    {recent.length === 0 ? <p>Henüz satış yok.</p> : <Table className={ownerTable}>
      <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Eğitim</TableHead><TableHead>Alıcı</TableHead><TableHead>Tutar</TableHead></TableRow></TableHeader>
      <TableBody>{recent.map(sale => <TableRow key={sale.id}><TableCell>{date.format(sale.at)}<br /><small>#{sale.order}</small></TableCell><TableCell>{sale.title}</TableCell><TableCell>{sale.email}<br /><small>{sale.claimed ? "Hesaba eklendi" : "Hesap bekleniyor"}</small></TableCell><TableCell>{formatPrice(sale.amount)}</TableCell></TableRow>)}</TableBody>
    </Table>}
    {attention.length > 0 && <>
      <h2 className="mb-4 mt-12 text-2xl">İlgilenilmesi gerekenler</h2>
      <p className="mb-4">Bu Shopier bildirimleri işlenemedi. Shopier yeniden dener; günlük eşitleme siparişleri ayrıca yeniden okur.</p>
      <Table className={ownerTable}><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Bildirim</TableHead><TableHead>Deneme</TableHead><TableHead>Hata</TableHead></TableRow></TableHeader>
        <TableBody>{attention.map(item => <TableRow key={item.eventIdentity}><TableCell>{date.format(item.at)}</TableCell><TableCell>{item.eventIdentity}</TableCell><TableCell>{item.attempts}</TableCell><TableCell><small>{item.error}</small></TableCell></TableRow>)}</TableBody>
      </Table>
    </>}
  </>;
}
