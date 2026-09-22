import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { formatAccess, getCatalogCourse } from "@/lib/akademi/catalog";
import { CoursePrice } from "@/components/akademi/course-price";
import { buttonVariants } from "@/components/ui/button";
import { kicker, pageWidth, textLink } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const revalidate = 600;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const course = await getCatalogCourse((await params).slug);
  return { title: course?.title, description: course?.summary.slice(0, 160), robots: { index: !!course, follow: true }, alternates: course ? { canonical: `/akademi/${course.slug}` } : undefined };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCatalogCourse((await params).slug);
  if (!course) notFound();
  return <div className={cn(pageWidth, "pt-[140px] pb-[90px]")}>
    <Link href="/akademi#egitimler" className={textLink}><ArrowLeft size={16} /> Tüm eğitimler</Link>
    <div className="mt-[45px] grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-[65px] max-tablet:mt-[25px] max-tablet:grid-cols-1 max-tablet:gap-[30px]">
      <div>
        <p className={kicker}>NİLGÜN OYGUR AKADEMİ</p>
        <h1 className="my-5 text-[clamp(40px,5vw,64px)]">{course.title}</h1><p className="mb-[30px] line-clamp-3 text-[18px] leading-[1.8]">{course.summary}</p>
        <div className="relative aspect-[1.5] overflow-hidden rounded-[22px]"><Image src={course.image} alt={course.title} fill sizes="(max-width:760px) 90vw, 760px" priority /></div>
        {course.descriptionHtml && <div className="mt-10 max-w-[68ch] leading-[1.8] text-[#3f3f3b] [&_li]:mb-[6px] [&_ol]:mb-[14px] [&_ol]:list-decimal [&_ol]:pl-[22px] [&_p]:mt-0 [&_p]:mb-[14px] [&_ul]:mb-[14px] [&_ul]:list-disc [&_ul]:pl-[22px] [&_:is(h2,h3,h4)]:mt-8 [&_:is(h2,h3,h4)]:mb-[10px] [&_:is(h2,h3,h4)]:text-[22px] [&_:is(h2,h3,h4)]:leading-[1.3] [&_:is(h2,h3,h4)]:text-[#1c1c1a]" dangerouslySetInnerHTML={{ __html: course.descriptionHtml }} />}
      </div>
      <aside className="sticky top-[115px] rounded-[24px] border border-[#dce4d5] bg-[#f4f7ee] p-8 max-tablet:static max-tablet:p-6">
        <p className={cn(kicker, "my-5")}>KENDİNİZE BİR ALAN AÇIN</p>
        <h2 className="my-5 text-[32px] leading-[1.25]">Yolculuğunuz burada başlasın.</h2>
        <CoursePrice large className="mt-3 mb-[25px]" priceClassName="text-[44px]" priceKurus={course.priceKurus} compareAtPriceKurus={course.compareAtPriceKurus} />
        <ul className="mb-[30px] grid list-none gap-[15px] p-0 text-[14px]">{[formatAccess(course.accessDurationDays), "Kendi ritminizde öğrenme", "Kişisel eğitim alanı"].map(x => <li key={x} className="flex items-center gap-[10px]"><Check size={17} aria-hidden="true" />{x}</li>)}</ul>
        <Link className={buttonVariants({ size: "hero", className: "w-full gap-3 rounded-[30px] bg-forest hover:bg-forest" })} href={`/akademi/${course.slug}/satin-al`}>Satın al <ArrowUpRight size={18} /></Link>
        <Link href="/akademi/giris" className={cn(textLink, "text-[12px]")}>Zaten hesabınız var mı? Giriş yapın</Link>
      </aside>
    </div>
  </div>;
}
