import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BookOpen, Check, Clock3 } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { akademi, courseCardDetails } from "@/lib/akademi/server";
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
  const [access, details] = await Promise.all([akademi().access.active(viewer.user.id), courseCardDetails()]);
  return <>
    <header className={accountHeader}><div><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Merhaba, {viewer.user.name}.</h1><p>Eğitimleriniz ve hesabınız burada.</p></div></header>
    {access.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><BookOpen /></EmptyMedia><EmptyTitle>Öğrenme yolculuğunuz burada başlıyor.</EmptyTitle><EmptyDescription>Henüz aktif bir eğitim erişiminiz bulunmuyor. Size uygun eğitimleri keşfedebilirsiniz.</EmptyDescription></EmptyHeader><EmptyContent><Link className={buttonVariants({ size: "pill" })} href="/akademi">Eğitimleri keşfet</Link></EmptyContent></Empty> : <div className="grid grid-cols-2 gap-8 max-tablet:grid-cols-1">{access.map(item => {
      const course = details[item.shopierProductId];
      const title = course?.title ?? "Akademi eğitimi";
      const href = `/akademi/hesabim/${item.courseId}`;
      return <article key={item.id} className="flex min-w-0 flex-col rounded-[24px] border border-[#e1e8dc] bg-white p-[10px] shadow-[0_6px_25px_#19392f08]">
        <Link href={href} aria-label={`${title} eğitimine devam et`} className="group relative block aspect-[1.65] overflow-hidden rounded-[17px] bg-mist">
          <Image src={course?.image ?? "/images/akademi/academy-art-v1.png"} alt="" fill sizes="(max-width: 760px) 90vw, (max-width: 1280px) 46vw, 590px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-forest px-3 py-2 text-xs font-semibold text-white shadow-sm"><Check size={14} aria-hidden="true" />Erişiminiz aktif</span>
        </Link>
        <div className="flex flex-1 flex-col px-[18px] pt-6 pb-[18px] max-tablet:px-[10px]">
          <p className="mb-3 text-[10px] font-semibold tracking-[1.6px] text-stone">EĞİTİMİNİZ</p>
          <h2 className="mb-5 text-[28px] leading-snug max-tablet:text-[25px]"><Link href={href}>{title}</Link></h2>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-5 border-t border-border pt-5">
            <div className="flex items-center gap-2.5 text-stone"><Clock3 size={17} aria-hidden="true" /><div><span className="block text-[11px]">Erişim bitişi</span><span className="mt-1 block text-sm text-foreground">{expiry.format(item.expiresAt)}</span></div></div>
            <Link className={buttonVariants({ size: "pill", className: "min-h-11 bg-forest hover:bg-forest/90" })} href={href}>Eğitime devam et <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </article>;
    })}</div>}


  </>;
}
