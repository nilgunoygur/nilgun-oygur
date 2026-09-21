import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gt, lte, isNull } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { studentPageSession } from "@/lib/auth/page-session";
import { getDatabase } from "@/lib/db";
import { courseAccess, courses, owners } from "@/lib/db/schema";
import { SignOut } from "@/components/akademi/sign-out";
import { ClaimOrderForm } from "@/components/akademi/claim-order-form";
import { claimPendingPurchases } from "@/lib/akademi/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
export const metadata: Metadata = { title: "Hesabım", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await studentPageSession();
  const db = getDatabase();
  await claimPendingPurchases(session.user.id, session.user.email);
  const now = new Date();
  const [access, owner] = await Promise.all([
    db.select({ id: courseAccess.id, title: courses.title, expiresAt: courseAccess.expiresAt }).from(courseAccess).innerJoin(courses, eq(courses.id, courseAccess.courseId)).where(and(eq(courseAccess.userId, session.user.id), isNull(courseAccess.revokedAt), lte(courseAccess.startsAt, now), gt(courseAccess.expiresAt, now))).orderBy(courseAccess.expiresAt),
    db.select({ userId: owners.userId }).from(owners).where(eq(owners.userId, session.user.id)).limit(1),
  ]);
  return <section className="academy-account page-width">
    <header><div><p className="academy-kicker">AKADEMİ · KİŞİSEL ALANINIZ</p><h1>Merhaba, {session.user.name}.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div><div className="flex flex-wrap items-center gap-4">{owner.length > 0 && <Link className={buttonVariants({ variant: "secondary", size: "pill" })} href="/yonetim">Yönetim alanı</Link>}<SignOut /></div></header>
    {access.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BookOpen /></EmptyMedia><EmptyTitle>Öğrenme yolculuğunuz burada başlıyor.</EmptyTitle><EmptyDescription>Henüz aktif bir eğitim erişiminiz bulunmuyor. Size uygun eğitimleri keşfedebilirsiniz.</EmptyDescription></EmptyHeader><EmptyContent><Link className={buttonVariants({ size: "pill" })} href="/akademi">Eğitimleri keşfet</Link></EmptyContent></Empty> : <div className="academy-account-list">{access.map(item => <Card key={item.id}><CardHeader><CardTitle>{item.title}</CardTitle><CardDescription>Aktif eğitim erişimi</CardDescription></CardHeader><CardContent>Erişim bitişi: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(item.expiresAt)}</CardContent><CardFooter>Ders alanı hazırlandığında eğitiminize buradan ulaşabilirsiniz.</CardFooter></Card>)}</div>}
    <section className="academy-claim" aria-labelledby="claim-title">
      <div><p className="academy-kicker">SATIN ALDIĞINIZ EĞİTİM GÖRÜNMÜYOR MU?</p><h2 id="claim-title">Siparişinizi ekleyin.</h2><p>Shopier’de <strong>{session.user.email}</strong> adresini kullandıysanız eğitiminiz otomatik eklenir. Farklı bir e-posta kullandıysanız sipariş numaranızla ekleyebilirsiniz.</p></div>
      <ClaimOrderForm />
    </section>
  </section>;
}
