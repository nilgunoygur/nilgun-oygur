import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { akademi, courseTitles } from "@/lib/akademi/server";
import { SignOut } from "@/components/akademi/sign-out";
import { ClaimOrderForm } from "@/components/akademi/claim-order-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata: Metadata = { title: "Hesabım", robots: { index: false, follow: false } };

const expiry = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

export default function AccountPage() {
  return <section className={cn(pageWidth, accountPage)}>
    <Suspense fallback={<header className={accountHeader}><div><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Merhaba.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div></header>}>
      <Account />
    </Suspense>
  </section>;
}

async function Account() {
  const viewer = await studentPage();
  const [access, titles] = await Promise.all([akademi().access.active(viewer.user.id), courseTitles()]);
  return <>
    <header className={accountHeader}><div><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Merhaba, {viewer.user.name}.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div><div className="flex flex-wrap items-center gap-4">{viewer.owner && <Link className={buttonVariants({ variant: "secondary", size: "pill" })} href="/yonetim">Yönetim alanı</Link>}<SignOut /></div></header>
    {access.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BookOpen /></EmptyMedia><EmptyTitle>Öğrenme yolculuğunuz burada başlıyor.</EmptyTitle><EmptyDescription>Henüz aktif bir eğitim erişiminiz bulunmuyor. Size uygun eğitimleri keşfedebilirsiniz.</EmptyDescription></EmptyHeader><EmptyContent><Link className={buttonVariants({ size: "pill" })} href="/akademi">Eğitimleri keşfet</Link></EmptyContent></Empty> : <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">{access.map(item => <Card key={item.id}><CardHeader><CardTitle>{titles[item.shopierProductId] ?? "Akademi eğitimi"}</CardTitle><CardDescription>Aktif eğitim erişimi</CardDescription></CardHeader><CardContent>Erişim bitişi: {expiry.format(item.expiresAt)}</CardContent><CardFooter>Ders alanı hazırlandığında eğitiminize buradan ulaşabilirsiniz.</CardFooter></Card>)}</div>}
    <section className="mt-16 grid grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-10 rounded-[20px] bg-mist p-9 max-[861px]:grid-cols-1 max-[861px]:p-6" aria-labelledby="claim-title">
      <div><p className={cn(kicker, "leading-[1.7]")}>SATIN ALDIĞINIZ EĞİTİM GÖRÜNMÜYOR MU?</p><h2 id="claim-title" className="my-3 text-[30px]">Siparişinizi ekleyin.</h2><p className="leading-[1.7]">Shopier’de <strong>{viewer.user.email}</strong> adresini kullandıysanız eğitiminiz otomatik eklenir. Farklı bir e-posta kullandıysanız sipariş numaranızla ekleyebilirsiniz.</p></div>
      <ClaimOrderForm />
    </section>
  </>;
}
