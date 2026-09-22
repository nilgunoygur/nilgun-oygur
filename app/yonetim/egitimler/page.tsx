import Link from "next/link";
import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ownerPageSession } from "@/lib/auth/page-session";
import { getDatabase } from "@/lib/db";
import { courses, shopierPurchases } from "@/lib/db/schema";
import { formatPrice, getProductsById } from "@/lib/akademi/catalog";
import { productDetails } from "@/lib/shopier/api";
import { setAccessDuration, setCourseStatus, syncCatalogNow } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Eğitimler" };
const statusLabel = { draft: "Taslak", published: "Yayında", archived: "Arşivde" } as const;
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function OwnerCourses() {
  await ownerPageSession();
  const db = getDatabase();
  const [rows, recent, products] = await Promise.all([
    db.select({
      id: courses.id, slug: courses.slug, productId: courses.shopierProductId, status: courses.status, accessDurationDays: courses.accessDurationDays,
      sales: count(shopierPurchases.id), claimed: sql<number>`count(${shopierPurchases.userId})::int`,
    }).from(courses).leftJoin(shopierPurchases, eq(shopierPurchases.courseId, courses.id)).groupBy(courses.id).orderBy(desc(courses.createdAt)),
    db.select({ id: shopierPurchases.id, order: shopierPurchases.shopierOrderId, productId: courses.shopierProductId, email: shopierPurchases.buyerEmail, amount: shopierPurchases.amountKurus, at: shopierPurchases.purchasedAt, claimed: isNotNull(shopierPurchases.userId) })
      .from(shopierPurchases).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).orderBy(desc(shopierPurchases.purchasedAt)).limit(25),
    getProductsById(),
  ]);
  const titleOf = (productId: string) => products.get(productId)?.title ?? `Shopier ürünü ${productId}`;
  return <section className="academy-account page-width">
    <header>
      <div><p className="academy-kicker">AKADEMİ YÖNETİMİ</p><h1>Eğitimler ve satışlar</h1><p>Eğitimler Shopier mağazanızdan gelir: görünür, stokta olan dijital ürünler otomatik eklenir, silinenler kaldırılır. Başlık, görsel ve fiyatı Shopier’de düzenleyin.</p></div>
      <div className="flex flex-wrap items-center gap-4"><form action={syncCatalogNow}><Button size="pill">Shopier ile eşitle</Button></form><Link className="underline" href="/yonetim">Yönetim ana sayfası</Link></div>
    </header>
    <h2 className="mb-4 text-2xl">Eğitimler</h2>
    {rows.length === 0 ? <p>Henüz eğitim yok. Shopier’de görünür bir dijital ürün ekleyin.</p> : <table className="academy-owner-table">
      <thead><tr><th>Eğitim</th><th>Fiyat</th><th>Erişim</th><th>Satış</th><th>Durum</th></tr></thead>
      <tbody>{rows.map(course => {
        const details = products.get(course.productId);
        const price = details && productDetails(details)?.priceKurus;
        return <tr key={course.id}>
          <td><strong>{titleOf(course.productId)}</strong><br /><small>/akademi/{course.slug}</small><br /><a className="underline" href={`https://www.shopier.com/${course.productId}`} rel="noopener" target="_blank">Shopier ürünü</a></td>
          <td>{price ? formatPrice(price) : "—"}</td>
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
    {recent.length === 0 ? <p>Henüz satış yok.</p> : <table className="academy-owner-table">
      <thead><tr><th>Tarih</th><th>Eğitim</th><th>Alıcı</th><th>Tutar</th></tr></thead>
      <tbody>{recent.map(sale => <tr key={sale.id}><td>{date.format(sale.at)}<br /><small>#{sale.order}</small></td><td>{titleOf(sale.productId)}</td><td>{sale.email}<br /><small>{sale.claimed ? "Hesaba eklendi" : "Hesap bekleniyor"}</small></td><td>{formatPrice(sale.amount)}</td></tr>)}</tbody>
    </table>}
  </section>;
}
