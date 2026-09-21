import Link from "next/link";
import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ownerPageSession } from "@/lib/auth/page-session";
import { getDatabase } from "@/lib/db";
import { courses, shopierPurchases } from "@/lib/db/schema";
import { formatAccess, formatPrice } from "@/lib/akademi/catalog";
import { setCourseStatus } from "./actions";
import { CourseForm } from "@/components/akademi/course-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Eğitimler" };
const statusLabel = { draft: "Taslak", published: "Yayında", archived: "Arşivde" } as const;
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function OwnerCourses() {
  await ownerPageSession();
  const db = getDatabase();
  const [rows, recent] = await Promise.all([
    db.select({
      id: courses.id, slug: courses.slug, title: courses.title, status: courses.status, priceKurus: courses.priceKurus,
      accessDurationDays: courses.accessDurationDays, shopierUrl: courses.shopierUrl,
      sales: count(shopierPurchases.id), claimed: sql<number>`count(${shopierPurchases.userId})::int`,
    }).from(courses).leftJoin(shopierPurchases, eq(shopierPurchases.courseId, courses.id)).groupBy(courses.id).orderBy(desc(courses.createdAt)),
    db.select({ id: shopierPurchases.id, order: shopierPurchases.shopierOrderId, title: courses.title, email: shopierPurchases.buyerEmail, amount: shopierPurchases.amountKurus, at: shopierPurchases.purchasedAt, claimed: isNotNull(shopierPurchases.userId) })
      .from(shopierPurchases).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).orderBy(desc(shopierPurchases.purchasedAt)).limit(25),
  ]);
  return <section className="academy-account page-width">
    <header><div><p className="academy-kicker">AKADEMİ YÖNETİMİ</p><h1>Eğitimler ve satışlar</h1><p>Ödemeler Shopier’de alınır; onaylanan siparişler öğrencinin hesabına otomatik eklenir.</p></div><Link className="underline" href="/yonetim">Yönetim ana sayfası</Link></header>
    <div className="academy-owner-grid">
      <div>
        <h2 className="mb-4 text-2xl">Eğitimler</h2>
        {rows.length === 0 ? <p>Henüz eğitim yok. Sağdaki formdan ilk eğitimi ekleyin.</p> : <table className="academy-owner-table">
          <thead><tr><th>Eğitim</th><th>Fiyat</th><th>Satış</th><th>Durum</th></tr></thead>
          <tbody>{rows.map(course => <tr key={course.id}>
            <td><strong>{course.title}</strong><br /><small>/akademi/{course.slug} · {formatAccess(course.accessDurationDays)}</small><br />{course.shopierUrl && <a className="underline" href={course.shopierUrl} rel="noopener" target="_blank">Shopier ürünü</a>}</td>
            <td>{formatPrice(course.priceKurus)}</td>
            <td>{course.sales}<br /><small>{course.sales - course.claimed} hesap bekliyor</small></td>
            <td>{statusLabel[course.status]}<form action={setCourseStatus} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="courseId" value={course.id} />
              {course.status !== "published" && <Button size="sm" name="status" value="published">Yayınla</Button>}
              {course.status === "published" && <Button size="sm" variant="outline" name="status" value="draft">Yayından kaldır</Button>}
              {course.status !== "archived" && <Button size="sm" variant="ghost" name="status" value="archived">Arşivle</Button>}
            </form></td>
          </tr>)}</tbody>
        </table>}
        <h2 className="mb-4 mt-12 text-2xl">Son satışlar</h2>
        {recent.length === 0 ? <p>Henüz satış yok.</p> : <table className="academy-owner-table">
          <thead><tr><th>Tarih</th><th>Eğitim</th><th>Alıcı</th><th>Tutar</th></tr></thead>
          <tbody>{recent.map(sale => <tr key={sale.id}><td>{date.format(sale.at)}<br /><small>#{sale.order}</small></td><td>{sale.title}</td><td>{sale.email}<br /><small>{sale.claimed ? "Hesaba eklendi" : "Hesap bekleniyor"}</small></td><td>{formatPrice(sale.amount)}</td></tr>)}</tbody>
        </table>}
      </div>
      <div><h2 className="mb-4 text-2xl">Eğitim ekle</h2><CourseForm /></div>
    </div>
  </section>;
}
