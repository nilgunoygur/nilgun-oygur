import Image from "next/image";
import { IntroVideo } from "@/components/intro-video";
import Link from "next/link";
import {
  Armchair,
  Headphones,
  Camera,
  Video,
  CalendarDays,
  Fingerprint,
  Sprout,
  Check,
  ArrowUpRight,
} from "lucide-react";
import {
  Hero,
  About,
  SocialSection,
  Journey,
  BlogSection,
  SectionHeading,
  Booking,
} from "@/components/site";
import { Reveal } from "@/components/reveal";
import { asset, pages } from "@/lib/content";
import { eyebrow, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
const steps = [
  {
    icon: CalendarDays,
    title: "Ücretsiz Danışmanlık Randevusu Alın",
    text: "Randevunuzu planlamak için formu doldurun. Dönüşüm yolculuğunuza başlamak için 15 dakikalık ücretsiz bir telefon görüşmesi planlayın.",
  },
  {
    icon: Fingerprint,
    title: "Yolculuğunuzu Tasarlayalım",
    text: "15 dk. konuşma sonrasında belirlenen ilk randevu için yapılan ücret ödemesinden sonra yaklaşık 2 saatlik bir danışmanlık ve tespit süreci",
  },
  {
    icon: Sprout,
    title: "İlerlemeye Başlayalım",
    text: "Detaylı analizden sonra hangi yaşam tasarımına ihtiyacınız olduğunu belirlenir ve 5-6 saatlik planlanan seansınız yapılır.",
  },
];
const focusTitle = "mb-[25px] text-[44px] max-tablet:text-[34px]";

export default function Home() {
  return (
    <>
      <Hero
        eyebrow="Potansiyelinizi Keşfedin"
        title="Kendinizi Keşfetme Yolculuğuna Çıkın"
        description="Deneyim ve çalışmalarımızla potansiyelinizi ortaya çıkaralım. Bugün daha parlak bir geleceğe giden yola çıkmak için ilk adımı atın."
        stats
      />
      <About />
      <section className="rounded-none bg-muted py-[110px] max-tablet:py-20">
        <div className={pageWidth}>
          <SectionHeading
            eyebrow="Temel Yaklaşım"
            title="Sürdürülebilir Prosedür"
          />
          <div className="grid grid-cols-[1fr_1.1fr] items-center gap-[90px] max-tablet:grid-cols-1 max-tablet:gap-[45px]">
            <IntroVideo />
            <div className="m-0 flex flex-col gap-[52px]">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.1} className="flex items-start gap-8 max-tablet:max-w-[470px] max-tablet:gap-5">
                  <step.icon className="m-0 size-[54px] shrink-0 text-primary max-tablet:size-11" strokeWidth={1} />
                  <div>
                    <h3>{step.title}</h3>
                    <p className="mt-3 text-[16px]">{step.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Booking label="Görüşme Ayarlayın" credit={false} className="m-auto mt-[55px]" />
        </div>
      </section>
      <SocialSection />
      <section className={cn(pageWidth, "py-20 max-tablet:py-10")}>
        <SectionHeading eyebrow="Temel Konular" title="Sunduğum Servisler" />
        <div className="m-auto grid max-w-[736px] grid-cols-2 gap-5 max-tablet:grid-cols-1">
          {[
            {
              title: "Yüz Yüze veya Online Seanslar",
              text: "Psikolog ve spiritüel eğitmen olan benimle yüz yüze ve online seansı deneyimleyin.",
              href: "/iletisim",
            },
            {
              title: "Yüz Yüze ve Online Eğitimler",
              text: "Bilgi ve tecrübelerimi size sunduğum eğitimlerden yararlanın.",
              href: "/egitimlerim",
            },
          ].map((s, i) => (
            <Reveal key={s.href}>
              <Link href={s.href} className="group block rounded-[20px] bg-white px-[10px] pt-[10px] pb-7 shadow-[0_8px_30px_#00000008]">
                <div className="relative h-[300px] overflow-hidden rounded-[14px] max-tablet:h-[280px]">
                  <Image
                    src={asset(pages["/"].images[4 + i])}
                    alt={s.title}
                    fill
                    sizes="(max-width:760px) 90vw, 40vw"
                    className="transition-transform duration-500 group-hover:scale-[1.035]"
                  />
                </div>
                <h3 className="mx-[10px] mt-5 mb-3 flex items-center justify-between text-[20px]">
                  {s.title}
                  <ArrowUpRight className="w-5 shrink-0" />
                </h3>
                <p className="mx-[10px] text-[16px]">{s.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className={cn(pageWidth, "grid grid-cols-2 gap-x-20 gap-y-[45px] py-[130px] max-tablet:grid-cols-1 max-tablet:gap-9 max-tablet:py-[75px]")}>
        <Reveal className="col-span-full">
          <p className={eyebrow}>Neler Sunuyorum</p>
          <h2 className={focusTitle}>Psikolog ve Eğitmen Kimliğimle Ruhsal Rehberlik</h2>
        </Reveal>
        <Reveal className="m-0 grid grid-cols-2 gap-4 self-start text-muted-foreground">
          {[
            { label: "1-1 Seanslar", icon: Armchair, href: "/iletisim" },
            { label: "Online Seanslar", icon: Headphones, href: "/iletisim" },
            {
              label: "Instagram İçeriklerim",
              icon: Camera,
              href: "https://www.instagram.com/nilgun_oygur/",
            },
            {
              label: "Youtube Videolarım",
              icon: Video,
              href: "https://www.youtube.com/@nilgunoygur4942",
            },
          ].map(({ label, icon: Icon, href }, index) => (
            <Link key={label} href={href} className="flex min-h-[186px] flex-col items-center justify-center gap-4 rounded-[12px] bg-white px-[10px] py-5 text-center text-[21px] text-foreground shadow-[0_6px_24px_#00000008] max-tablet:min-h-[164px] max-tablet:text-[16px]">
              <span className={cn("grid size-[84px] place-items-center rounded-[12px] text-[#33959b]", ["bg-[#e8f4ee]", "bg-[#fff2e1]", "bg-[#eaf0ff]", "bg-[#ffe9e9]"][index])}>
                <Icon strokeWidth={1.25} className="size-12" />
              </span>
              {label}
            </Link>
          ))}
        </Reveal>
        <Reveal>
          <h2 className={focusTitle}>Odak Alanlarım</h2>
          <p>
            Bilgi ve tecrübelerimle size sunduğum eğitimlerde öğrenmenin ve
            doğru bilginin konforundan yararlanın.
          </p>
          <ul className="mt-[35px] mb-[45px] grid list-none grid-flow-col grid-cols-2 grid-rows-[repeat(4,auto)] gap-5 p-0 text-[15px] max-tablet:grid-flow-row max-tablet:grid-rows-none max-tablet:gap-x-3 max-tablet:gap-y-[18px] max-tablet:text-[14px]">
            {[
              "Kişilik Tasarımı",
              "Parasal ve Finansal tasarım",
              "Spiritüel Gelişim",
              "Potansiyelin Farkında Olma",
              "Kariyer Tasarımı",
              "İlişki Tasarımı",
              "Denge ve Bütünsel Yaklaşım",
              "Ruh, Beden ve Zihin Kombinasyonu",
            ].map((s) => (
              <li key={s} className="flex items-start gap-[10px]">
                <Check className="size-[18px] shrink-0 text-primary" />
                {s}
              </li>
            ))}
          </ul>
          <Booking label="Görüşme Ayarlayın" credit={false} />
        </Reveal>
      </section>
      <Journey />
      <BlogSection />
    </>
  );
}
