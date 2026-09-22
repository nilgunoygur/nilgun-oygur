import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen, Clock3, Leaf } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { portrait } from "@/lib/content";
import { formatAccess, listCatalog } from "@/lib/akademi/catalog";
import { syncCatalogIfStale } from "@/lib/akademi/server";
import { CoursePrice } from "@/components/akademi/course-price";
import { PromoVideo } from "@/components/akademi/promo-video";
import { kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

const landingTitle = "my-[14px] text-[clamp(32px,3.4vw,46px)] leading-[1.2]";

export const metadata: Metadata = {
  title: "Akademi",
  description: "Nilgün Oygur Akademi eğitimlerini keşfedin. Kuantum, bioenerji, doğal taş ve regresyon programlarını inceleyin; öğrenme yolculuğunuza alan açın.",
  alternates: { canonical: "/akademi" },
};
// Regenerated in the background at most every 10 minutes, picking up Shopier changes.
export const revalidate = 600;

export default async function Academy() {
  await syncCatalogIfStale();
  const courses = await listCatalog();
  return (
    <div className="bg-[linear-gradient(to_bottom,transparent_70%,var(--background)),linear-gradient(155deg,#f1f5e9_0%,#fff_29%,#fff_70%,#f4f7ef_100%)]">
      <section className={cn(pageWidth, "relative grid grid-cols-[1.15fr_1fr] items-center gap-20 pt-[160px] pb-[100px] max-tablet:grid-cols-1 max-tablet:gap-[35px] max-tablet:pt-[130px] max-tablet:pb-[55px]")}>
        <div>
          <p className={cn(kicker, "flex items-center gap-[9px]")}><Leaf size={17} aria-hidden="true" /> NİLGÜN OYGUR AKADEMİ</p>
          <h1 className="my-[25px] text-[clamp(48px,5.7vw,76px)] leading-[1.09] tracking-[-2.5px] max-tablet:tracking-[-1.5px]">Kendinize açılan<br /><em className="text-[#285747] not-italic">yeni bir kapı.</em></h1>
          <p className="max-w-[470px] leading-[1.8]">Merakla başlayın, öğrenerek derinleşin. Kendinizi keşfetme yolculuğunuzda size eşlik edecek eğitimlerle tanışın.</p>
          <div className="mt-[30px] mb-[22px] flex flex-wrap items-center gap-[15px]">
            <Link href="#egitimler" className={buttonVariants({ size: "hero", variant: "default", className: "gap-3 rounded-[40px] bg-forest hover:bg-forest" })}>Eğitimleri keşfet <ArrowDown size={18} aria-hidden="true" /></Link>
            <Link href="/akademi/giris" className={buttonVariants({ size: "hero", variant: "outline", className: "gap-3 rounded-[40px]" })}>Öğrenci girişi <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          <p className="max-w-[470px] text-[13px] leading-[1.8] text-stone">Yeni bir başlangıç, sizin ritminizde. Online eğitim deneyimini keşfedin.</p>
        </div>
        <figure className="relative h-[540px] overflow-hidden rounded-[180px_180px_24px_24px] bg-accent shadow-[16px_16px_0_var(--color-sage)] max-tablet:mx-auto max-tablet:h-[420px] max-tablet:w-full max-tablet:max-w-[480px] max-tablet:shadow-[8px_8px_0_var(--color-sage)]">
          <Image src={portrait} alt="Nilgün Oygur" fill sizes="(max-width: 760px) 90vw, 480px" priority />
          <figcaption className="absolute inset-x-5 bottom-5 rounded-[14px] bg-accent px-[25px] py-5 leading-[1.6]">Nilgün Oygur ile<br /><strong>öğrenmeye alan açın.</strong></figcaption>
        </figure>
      </section>

      <section className={cn(pageWidth, "grid grid-cols-[.75fr_1.25fr] items-center gap-[60px] pt-[30px] pb-[100px] max-tablet:grid-cols-1 max-tablet:gap-[30px] max-tablet:pt-5 max-tablet:pb-[55px]")}><div><p className={kicker}>BİRKAÇ DAKİKALIĞINA KENDİNİZE DÖNÜN</p><h2 className={landingTitle}>Bir eğitimden<br />daha fazlası.</h2><p className="mt-5 leading-[1.8]">Yeni bir bakış açısı. Küçük bir günlük pratik. Kendiniz için ayırdığınız bir an. Akademi’nin dünyasına kısa bir bakış.</p><p className="mt-5 text-[12px] leading-[1.8] text-stone">Örnek tanıtım videosu — final anlatım hazırlanıyor.</p></div><PromoVideo /></section>

      <section id="egitimler" className={cn(pageWidth, "scroll-mt-[110px] pt-[30px] pb-[85px]")} aria-labelledby="academy-courses">
        <div className="mb-10 grid grid-cols-[1.2fr_1fr] items-end gap-[70px] max-tablet:grid-cols-1 max-tablet:gap-[5px]">
          <div><p className={kicker}>MERAKINIZIN PEŞİNDEN GİDİN</p><h2 id="academy-courses" className={landingTitle}>Yolculuğunuz nereden başlasın?</h2></div>
          <p className="leading-[1.8] text-stone">İlginizi çeken konuyu seçin; programın içeriğini ve size uygun olup olmadığını birlikte keşfedelim.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-[45px] max-tablet:grid-cols-1 max-tablet:gap-[30px]">
          {courses.map((course, index) => (
            <article className="flex min-w-0 flex-col rounded-[24px] border border-[#e1e8dc] bg-white p-[10px] shadow-[0_6px_25px_#19392f08]" key={course.slug}>
              <Link href={`/akademi/${course.slug}`} className="group relative block aspect-[1.65] overflow-hidden rounded-[17px] bg-accent" aria-label={course.title + " programını incele"}>
                <Image src={course.image} alt="" fill sizes="(max-width: 760px) 90vw, 580px" className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                <span className="absolute top-[18px] left-[18px] grid size-[38px] place-items-center rounded-full bg-white text-[12px] leading-none tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <span className="absolute top-[18px] right-[18px] inline-flex items-center gap-[6px] rounded-[99px] bg-forest px-[13px] py-2 text-[13px] leading-none font-semibold text-white shadow-[0_4px_14px_#0f2a2233]"><Clock3 size={14} aria-hidden="true" className="text-lime" />{formatAccess(course.accessDurationDays)}</span>
              </Link>
              <div className="flex flex-1 flex-col px-[18px] pt-6 pb-[18px] max-tablet:px-[10px]">
                <p className={kicker}>ONLINE EĞİTİM</p>
                <h3 className="my-[10px] text-[30px] max-tablet:text-[27px]"><Link href={`/akademi/${course.slug}`}>{course.title}</Link></h3>
                <p className="mb-5 line-clamp-3 min-h-[58px] leading-[1.7]">{course.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-[15px] border-t border-border pt-5"><div><small className="block text-[11px] text-stone">Fiyat</small><CoursePrice priceClassName="text-[30px] tracking-[-1px] max-tablet:text-[27px]" priceKurus={course.priceKurus} compareAtPriceKurus={course.compareAtPriceKurus} /></div><Link href={`/akademi/${course.slug}`} className={buttonVariants({ size: "pill", className: "bg-forest hover:bg-forest" })}>Eğitimi keşfet <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
              </div>
            </article>
          ))}
        </div>
        {courses.length === 0 && <div className="mt-10 flex gap-[15px] rounded-[16px] bg-muted p-6 text-[14px] leading-[1.7]"><BookOpen aria-hidden="true" className="shrink-0" /><p>Yeni eğitimler çok yakında burada olacak.</p></div>}
      </section>

      <section className={cn(pageWidth, "border-t border-border py-[65px] [&_p]:leading-[1.8] [&_p]:text-stone")} aria-labelledby="academy-how-title">
        <p className={kicker}>ADIM ADIM AKADEMİ</p>
        <h2 id="academy-how-title" className={landingTitle}>Meraktan öğrenmeye.</h2>
        <div className="mt-10 grid grid-cols-3 gap-[50px] max-tablet:grid-cols-1 max-tablet:gap-[30px] [&_h3]:mt-4 [&_h3]:mb-3 [&_h3]:text-[24px] [&_span]:text-[14px] [&_span]:text-primary">
          <div><span>01</span><h3>Eğitiminizi keşfedin</h3><p>Programları inceleyin. İçeriği, yaklaşımı ve ilgi alanlarınıza uygunluğunu değerlendirin.</p></div>
          <div><span>02</span><h3>Shopier ile güvenle ödeyin</h3><p>Ödemenizi Shopier üzerinden yapın. Akademi hesabınızdaki e-posta adresini kullanmanız yeterli.</p></div>
          <div><span>03</span><h3>Hesabınızdan devam edin</h3><p>Ödemeniz onaylandığında eğitiminiz, erişim süresi boyunca hesabınızda sizi bekler.</p></div>
        </div>
      </section>

      <section className={cn(pageWidth, "mt-[35px] mb-[90px] flex items-center justify-between gap-[30px] rounded-[24px] bg-accent py-[50px] max-tablet:mx-5 max-tablet:flex-col max-tablet:items-start")}>
        <div><p className={kicker}>KİŞİSEL ÖĞRENME ALANINIZ</p><h2 className={landingTitle}>Yolculuğunuza devam edin.</h2><p>Hesabınıza giriş yaparak eğitim alanınıza ulaşın.</p></div>
        <Link href="/akademi/giris" className={buttonVariants({ size: "hero", className: "gap-[14px] rounded-[40px]" })}>Öğrenci girişi <ArrowUpRight aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
