import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { BookOpen, Check, Clock3, Phone } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { akademi, courseCards } from "@/lib/akademi/server";
import { fallbackCover } from "@/lib/akademi/catalog";
import { hasCompleteContact } from "@/lib/auth/contact";
import { ClaimHint } from "@/components/akademi/claim-hint";
import { StudentCourseCard } from "@/components/akademi/student-course-card";
import { claimHintCookie } from "@/lib/akademi/claim-schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const hintClosed = (await cookies()).has(claimHintCookie);
  const [access, cards, contact] = await Promise.all([akademi().access.active(viewer.user.id), courseCards(), akademi().students.contact(viewer.user.id)]);
  return <>
    <header className={accountHeader}><div><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Merhaba, {viewer.user.name}.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div></header>
    {!hintClosed && <ClaimHint />}
    {!hasCompleteContact(contact) && <Alert className="mb-10"><Phone /><AlertTitle>İletişim bilgilerinizi tamamlayın</AlertTitle><AlertDescription>Eğitimlerinizle ilgili size ulaşabilmemiz için telefon ve adresinizi ekleyin. <Link href="/akademi/profil#iletisim" className="font-medium text-forest underline underline-offset-4">Profil ayarlarına git</Link></AlertDescription></Alert>}
    {access.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BookOpen /></EmptyMedia><EmptyTitle>Öğrenme yolculuğunuz burada başlıyor.</EmptyTitle><EmptyDescription>Henüz aktif bir eğitim erişiminiz bulunmuyor. Size uygun eğitimleri keşfedebilirsiniz.</EmptyDescription></EmptyHeader><EmptyContent><Link className={buttonVariants({ size: "pill" })} href="/akademi">Eğitimleri keşfet</Link></EmptyContent></Empty> : <div className="grid grid-cols-2 gap-8 max-tablet:grid-cols-1">{access.map(item => <StudentCourseCard key={item.id} href={`/akademi/hesabim/${item.slug}`}
      title={cards[item.shopierProductId]?.title ?? "Akademi eğitimi"} image={cards[item.shopierProductId]?.image ?? fallbackCover}
      badge={<><Check size={14} aria-hidden="true" />{item.refundPending ? "İade talebi · Dersler kapalı" : "Erişiminiz aktif"}</>} action={item.refundPending ? "Talep durumunu gör" : "Eğitime devam et"}>
      <div className="flex items-center gap-2.5 text-stone"><Clock3 size={17} aria-hidden="true" /><div><span className="block text-[11px]">Erişim bitişi</span><span className="mt-1 block text-sm text-foreground">{expiry.format(item.expiresAt)}</span></div></div>
    </StudentCourseCard>)}</div>}
  </>;
}
