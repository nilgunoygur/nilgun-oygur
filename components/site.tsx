import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Camera,
  Video,
  Mail,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Reveal } from "@/components/reveal";
import { GalleryStrip, ArticleCarousel } from "@/components/sliders";
import {
  asset,
  pages,
  portrait,
  logo,
  bookingUrl,
  courses,
  articles,
  blogIntro,
  socials,
  email,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { brand, brandLogo, eyebrow as eyebrowClass, pageWidth } from "@/lib/styles";

export function Booking({
  label = "Ücretsiz İlk Görüşme için Tıklayın",
  credit = true,
  className,
}: {
  label?: string;
  credit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex w-fit flex-col items-start gap-[13px]", className)}>
      <a
        className={buttonVariants({
          variant: credit ? "glow" : "secondary",
          size: "hero",
          className: cn("leading-normal whitespace-normal max-tablet:min-h-[52px] max-tablet:text-[17px]", !credit && "gap-3 rounded-[10px] bg-[#dff1e9] hover:bg-[#dff1e9]"),
        })}
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        {label === "Görüşme Ayarlayın" && <ArrowRight className={cn(!credit && "size-6")} />}
      </a>
      {credit && (
        <span className="flex items-center gap-[5px] self-center text-[12px] text-muted-foreground">
          With <b className="text-[20px] leading-[14px] text-[#3289e3]">◉</b> Calendly
        </span>
      )}
    </div>
  );
}
export function Hero({
  eyebrow,
  title,
  description,
  image = portrait,
  stats = false,
  contact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  stats?: boolean;
  contact?: boolean;
}) {
  return (
    <section className={cn(pageWidth, "grid items-center overflow-clip pt-[180px] pb-[135px] tablet:min-h-[896px] tablet:grid-cols-[1.056fr_1fr] tablet:gap-[76px] max-tablet:grid-cols-1 max-tablet:gap-[50px] max-tablet:pt-[145px] max-tablet:pb-[90px]")}>
      <div>
        <Reveal from="top">
          <p className={eyebrowClass}>{eyebrow}</p>
          <h1 className="mb-[26px] max-w-[590px] tablet:mb-5 max-laptop:text-[50px] max-tablet:max-w-[540px] max-tablet:text-[42px]">{title}</h1>
        </Reveal>
        <Reveal from="top" delay={0.3}>
          <p className="mb-16 text-[20px] leading-[1.5] font-medium tablet:max-w-[527px] max-laptop:text-[18px] max-tablet:mb-[38px] max-tablet:max-w-full">{description}</p>
        </Reveal>
        <Reveal from="top" delay={0.5}>
          <Booking label={contact ? "Şimdi Başlayalım" : undefined} />
        </Reveal>
      </div>
      <Reveal className="relative min-w-0 max-tablet:mx-2" delay={0.12}>
        <div className={cn(ribbon, "top-10 -left-[115px] bg-[#e2f0e7] blur-[6px] max-tablet:top-5 max-tablet:-left-[65px]")} />
        <div className={cn(ribbon, "top-[203px] -left-[82px] bg-[#969d9c] opacity-65 max-tablet:-left-[45px]")} />
        <div className={cn(ribbon, "-right-[175px] bottom-[50px] bg-primary")} />
        <div className="relative h-[581px] overflow-hidden rounded-[24px] max-tablet:h-[470px]">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 760px) 100vw, 46vw"
            preload
            className="object-[48.6%_40%]"
          />
        </div>
        {stats && (
          <div className="absolute -bottom-6 -left-[30px] flex items-center gap-6 rounded-[16px] border border-border bg-white/91 px-[38px] py-3 shadow-[0_6px_24px_#00000005] backdrop-blur-[12px] max-tablet:-bottom-[34px] max-tablet:left-1/2 max-tablet:-translate-x-1/2 max-tablet:gap-7 max-tablet:px-[22px] max-tablet:py-[17px]">
            {[["50+", "Değişen Yaşam ❤️"], ["90+", "Mutlu Danışan 😊"]].map(([value, label], index) => <Fragment key={value}>
              {index > 0 && <Separator orientation="vertical" className="h-12 tablet:hidden" />}
              <div className="flex flex-col gap-1">
                <strong className="text-[28px] font-medium">{value}</strong>
                <span className="text-[16px] whitespace-nowrap text-muted-foreground max-tablet:text-[12px]">{label}</span>
              </div>
            </Fragment>)}
          </div>
        )}
      </Reveal>
    </section>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-[70px] text-center max-tablet:mb-[45px]", className)}>
      {eyebrow && <p className={cn(eyebrowClass, "text-mint")}>{eyebrow}</p>}
      <h2>{title}</h2>
    </Reveal>
  );
}
export function About({ full = false }: { full?: boolean }) {
  const bio = pages["/nilgun-oygur"].text.slice(6, 11);
  return (
    <section className={cn(pageWidth, "relative grid grid-cols-[1.1fr_1fr] items-center gap-[100px] bg-muted pt-[100px] pb-[130px] before:pointer-events-none before:absolute before:inset-y-0 before:inset-x-[calc((1280px-100vw)/2)] before:-z-1 before:bg-muted before:content-[''] max-page:before:inset-0 max-laptop:gap-[55px] max-tablet:grid-cols-1 max-tablet:gap-[45px] max-tablet:pt-[65px] max-tablet:pb-[85px]", full && "items-start pt-[180px] max-tablet:pt-[150px]")}>
      <Reveal className="max-tablet:[&_p]:text-[17px]">
        <p className={cn(eyebrowClass, "text-mint")}>{full ? "Tanışalım" : "Haydi Tanışalım"}</p>
        {full ? <h1 className="mb-[30px]">Nilgün Oygur</h1> : <h2 className="mb-[30px]">Benim Hakkımda</h2>}
        {full ? (
          bio.map((x) => <p key={x.text} className="mb-[22px]">{x.text}</p>)
        ) : (
          <>
            <p className="mb-[22px]">
              Merhaba ben spiritüel eğitmen ve psikoloji mezunu olarak kendi
              yaşamımda yaşadığım döngüleri ve tekrar eden olumsuzlukların ne
              olduğunu anlamaya ve çözmeye çalışırken sana yardımcı olacak
              ruhsal rehberin Nilgün Oygur.
            </p>
            <p className="mb-[22px]">
              Benim misyonum; sizin var olan potansiyelinizi keşfetmenizi
              bütüncül bir yaklaşım ile sağlamak ve size bu konuda yardımcı
              olarak yol göstermektir.
            </p>
            <p className="mb-[22px]">
              Eğer sizde bu yolda profesyonel ellerde olmak istiyorsanız sizi
              bütünsel şifa akademi ailesinde görmekten mutluluk duyarım.
            </p>
            <Link
              className={buttonVariants({ variant: "secondary", size: "pill", className: "mt-[18px]" })}
              href="/nilgun-oygur"
            >
              Biyografimi İnceleyin <ArrowUpRight data-icon="inline-end" />
            </Link>
          </>
        )}
      </Reveal>
      <Reveal className={cn("relative mx-[30px] max-tablet:mx-[15px]", full && "sticky top-[140px] max-tablet:relative max-tablet:top-0")}>
        <Image
          src={asset(pages["/"].images[2])}
          alt="Nilgün Oygur"
          width={500}
          height={650}
          sizes="(max-width: 760px) 90vw, 40vw"
          className="h-[580px] w-full rounded-[24px] object-cover max-tablet:h-[480px]"
        />
        <span className={cn(floatingLabel, "top-20 -left-[60px] max-tablet:top-[60px] max-tablet:-left-5")}>
          <Check className="w-5 text-primary" /> Bütüncül Yaklaşım
        </span>
        <span className={cn(floatingLabel, "-right-[45px] bottom-20 max-tablet:-right-5 max-tablet:bottom-[50px]")}>
          <Check className="w-5 text-primary" /> Kanıtlanmış Sonuçlar
        </span>
      </Reveal>
    </section>
  );
}
export function SocialSection() {
  return (
    <section className={cn(pageWidth, "relative block pt-[140px] pb-[180px] before:absolute before:inset-y-0 before:inset-x-[calc(50%-50vw)] before:-z-1 before:rounded-[0_0_0_55%/0_0_0_10%] before:bg-[#f5f5f7] before:content-[''] max-tablet:pt-[70px] max-tablet:pb-[90px]")}>
      <Reveal className="relative isolate min-h-[496px] overflow-hidden rounded-[24px] bg-[linear-gradient(90deg,#b7dadd_0%,#d7ebeb_48%,#fff_100%)] px-[60px] py-[120px] after:absolute after:inset-0 after:-z-1 after:bg-[linear-gradient(90deg,#b7dadd_0%,#d7ebeb_48%,#fff_100%)] after:content-[''] max-tablet:min-h-[660px] max-tablet:px-6 max-tablet:py-9 max-tablet:after:bg-[linear-gradient(180deg,#b7dadd_0%,#b7dadd55_60%,transparent_100%)]">
        <Image
          src={asset(pages["/"].images[3])}
          alt="Nilgün Oygur"
          fill
          sizes="(max-width: 760px) 160vw, 100vw"
          className="z-0 inset-x-[-30px]! inset-y-[-172px]! h-[calc(100%+344px)]! w-[calc(100%+60px)]! max-w-none rounded-none object-cover [mask-image:linear-gradient(90deg,transparent_37%,#000_60%)] max-tablet:top-auto! max-tablet:right-[-70px]! max-tablet:bottom-[-10px]! max-tablet:left-auto! max-tablet:h-[528px]! max-tablet:w-[800px]! max-tablet:[mask-image:linear-gradient(180deg,transparent_0%,#000_32%)]"
        />
        <div className="relative z-1 max-w-[580px]">
          <p className={cn(eyebrowClass, "text-[#249fa4]")}>Beni İnternette Keşfedin</p>
          <h2 className="text-[44px] font-normal tracking-[-1px] max-tablet:text-[32px]">
            Dönüşüm Her Zaman
            <br />
            İçeriden Gelir
          </h2>
          <SocialLinks className="mt-12 max-tablet:mt-6" />
        </div>
      </Reveal>
    </section>
  );
}
export function Journey({ gallery = true }: { gallery?: boolean }) {
  return (
    <section className="overflow-hidden bg-white py-[100px] max-tablet:py-[70px]">
      <div className={pageWidth}>
        <Reveal className="mx-auto mb-[55px] max-w-[670px] text-center max-tablet:mb-[45px]">
          <p className={eyebrowClass}>İletişime Geçin</p>
          <h2 className="mb-6">Yolculuğunuzu başlatın</h2>
          <p className="mb-[34px]">
            Benzersiz ihtiyaçlarınıza yönelik mükemmel yaşam koçu veya
            psikologla bağlantı kurmak için hızlı değerlendirmeme katılın.
          </p>
          <Booking label="Şimdi Başlayalım" credit={false} className="m-auto" />
        </Reveal>
        {gallery && (
          <GalleryStrip
            images={pages["/nilgun-oygur"].images.slice(4, 10).map(asset)}
          />
        )}
      </div>
    </section>
  );
}
export function BlogSection() {
  return (
    <section className={cn(pageWidth, "block py-[130px] max-tablet:py-20")}>
      <Reveal className="mx-auto mb-[54px] max-w-[780px] text-center">
        <p className={eyebrowClass}>Güncel</p>
        <h2>Yazılarım</h2>
        <p className="my-6 text-[16px]">{blogIntro}</p>
        <Link
          href="/blog"
          className={buttonVariants({ variant: "secondary", size: "pill" })}
        >
          Tüm Yazılarım
          <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Reveal>
      <ArticleCarousel articles={articles.slice(0, 6)} />
    </section>
  );
}
export function Footer() {
  return (
    <footer className={cn(pageWidth, "pt-[60px] pb-[25px] max-tablet:pt-[30px]")}>
      <div className="mb-[65px] grid grid-cols-[1.4fr_0.8fr_1fr_1fr] items-start gap-[50px] max-laptop:gap-[25px] max-tablet:mb-10 max-tablet:grid-cols-2 max-tablet:gap-x-6 max-tablet:gap-y-10">
        <Link className={cn(brand, "max-tablet:col-span-full")} href="/">
          <Image src={logo} alt="" width={42} height={42} className={brandLogo} />
          <span>Nilgün Oygur</span>
        </Link>
        <div className={footerColumn}>
          <Link href="/">Anasayfa</Link>
          <Link href="/nilgun-oygur">Hakkımda</Link>
          <Link href="/kitaplarim">Kitaplarım</Link>
          <Link href="/blog">Yazılarım</Link>
        </div>
        <div className={footerColumn}>
          <Link href="/egitimlerim">Eğitimlerim</Link>
          <Link href="/akademi">Akademi</Link>
          {courses.map((c) => (
            <Link key={c.slug} href={c.href}>
              {c.title}
            </Link>
          ))}
        </div>
        <div className={footerColumn}>
          <Link href="/iletisim">İletişime Geçin</Link>
          <div className="flex gap-5">
            <a href={socials[1].href} aria-label="Instagram">
              <Camera size={20} />
            </a>
            <a href={socials[2].href} aria-label="Youtube">
              <Video size={20} />
            </a>
            <a href={`mailto:${email}`} aria-label="E-posta">
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
      <Separator />
      <p className="pt-[26px] text-center text-[13px]">Nilgün Oygur © 2024.</p>
    </footer>
  );
}

const ribbon = "pointer-events-none absolute -z-1 h-24 w-[370px] rotate-[28deg] rounded-[100px]";
const floatingLabel = "absolute flex items-center gap-3 rounded-[14px] border border-[#eee] bg-white px-[22px] py-[18px] text-[18px] whitespace-nowrap shadow-[0_3px_25px_#0000000e] max-tablet:px-4 max-tablet:py-[14px] max-tablet:text-[14px]";
const footerColumn = "flex flex-col gap-4 text-[14px] text-muted-foreground max-tablet:text-[13px] [&_a:hover]:text-primary [&>a:first-child]:mb-1 [&>a:first-child]:text-[18px] [&>a:first-child]:font-medium [&>a:first-child]:text-foreground max-tablet:[&>a:first-child]:text-[16px]";

export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-[10px] max-tablet:gap-2", className)}>
      {socials.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "secondary",
            size: "pill",
            className: "min-h-14 rounded-[24px] bg-white px-5 py-[14px] text-[20px] leading-[calc(1.25/0.875)] font-normal hover:bg-[#f4faf8] max-tablet:min-h-11 max-tablet:px-3 max-tablet:py-[10px] max-tablet:text-[15px]",
          })}
        >
          <SocialIcon name={s.label} className="size-[23px] max-tablet:size-[18px]" />
          {s.label}
        </a>
      ))}
    </div>
  );
}

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {name === "Instagram" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" />
        </>
      ) : name === "Youtube" ? (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 6 3-6 3Z" />
        </>
      ) : (
        <>
          <rect x="3" y="2" width="18" height="20" rx="3" />
          <path d="M13 6v10a3 3 0 1 1-3-3m3-7c.5 3 2 4 4 4" />
        </>
      )}
    </svg>
  );
}
