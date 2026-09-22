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
import { getProductsById } from "@/lib/akademi/catalog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata: Metadata = { title: "Hesabım", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await studentPageSession();
  const db = getDatabase();
  await claimPendingPurchases(session.user.id, session.user.email);
  const now = new Date();
  const [access, owner, products] = await Promise.all([
    db.select({ id: courseAccess.id, productId: courses.shopierProductId, expiresAt: courseAccess.expiresAt }).from(courseAccess).innerJoin(courses, eq(courses.id, courseAccess.courseId)).where(and(eq(courseAccess.userId, session.user.id), isNull(courseAccess.revokedAt), lte(courseAccess.startsAt, now), gt(courseAccess.expiresAt, now))).orderBy(courseAccess.expiresAt),
    db.select({ userId: owners.userId }).from(owners).where(eq(owners.userId, session.user.id)).limit(1),
    getProductsById().catch(() => new Map()),
  ]);
  return <section className={cn(pageWidth, accountPage)}>
    <header className={accountHeader}><div><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Merhaba, {session.user.name}.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div><div className="flex flex-wrap items-center gap-4">{owner.length > 0 && <Link className={buttonVariants({ variant: "secondary", size: "pill" })} href="/yonetim">Yönetim alanı</Link>}<SignOut /></div></header>
    {access.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BookOpen /></EmptyMedia><EmptyTitle>Öğrenme yolculuğunuz burada başlıyor.</EmptyTitle><EmptyDescription>Henüz aktif bir eğitim erişiminiz bulunmuyor. Size uygun eğitimleri keşfedebilirsiniz.</EmptyDescription></EmptyHeader><EmptyContent><Link className={buttonVariants({ size: "pill" })} href="/akademi">Eğitimleri keşfet</Link></EmptyContent></Empty> : <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">{access.map(item => <Card key={item.id}><CardHeader><CardTitle>{products.get(item.productId)?.title ?? "Akademi eğitimi"}</CardTitle><CardDescription>Aktif eğitim erişimi</CardDescription></CardHeader><CardContent>Erişim bitişi: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(item.expiresAt)}</CardContent><CardFooter>Ders alanı hazırlandığında eğitiminize buradan ulaşabilirsiniz.</CardFooter></Card>)}</div>}
    <section className="mt-16 grid grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-10 rounded-[20px] bg-mist p-9 max-[861px]:grid-cols-1 max-[861px]:p-6" aria-labelledby="claim-title">
      <div><p className={cn(kicker, "leading-[1.7]")}>SATIN ALDIĞINIZ EĞİTİM GÖRÜNMÜYOR MU?</p><h2 id="claim-title" className="my-3 text-[30px]">Siparişinizi ekleyin.</h2><p className="leading-[1.7]">Shopier’de <strong>{session.user.email}</strong> adresini kullandıysanız eğitiminiz otomatik eklenir. Farklı bir e-posta kullandıysanız sipariş numaranızla ekleyebilirsiniz.</p></div>
      <ClaimOrderForm />
    </section>
  </section>;
}
