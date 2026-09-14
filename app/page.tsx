import Image from "next/image";
import { IntroVideo } from "@/components/intro-video";
import Link from "next/link";
import {
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
      <section className="process-section">
        <div className="page-width">
          <SectionHeading
            eyebrow="Temel Yaklaşım"
            title="Sürdürülebilir Prosedür"
          />
          <div className="process-layout">
            <IntroVideo />
            <div className="process-grid">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.1}>
                  <step.icon className="process-icon" strokeWidth={1} />
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Booking label="Görüşme Ayarlayın" credit={false} />
        </div>
      </section>
      <SocialSection />
      <section className="services-section page-width">
        <SectionHeading eyebrow="Temel Konular" title="Sunduğum Servisler" />
        <div className="service-grid">
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
              <Link href={s.href} className="service-card">
                <div className="service-image">
                  <Image
                    src={asset(pages["/"].images[4 + i])}
                    alt={s.title}
                    fill
                    sizes="(max-width:760px) 90vw, 40vw"
                  />
                </div>
                <h3>
                  {s.title}
                  <ArrowUpRight />
                </h3>
                <p>{s.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="focus-section page-width">
        <Reveal>
          <p className="eyebrow">Neler Sunuyorum</p>
          <h2>Psikolog ve Eğitmen Kimliğimle Ruhsal Rehberlik</h2>
          <div className="focus-links">
            <span>1-1 Seanslar</span>
            <span>Online Seanslar</span>
            <a href="https://www.instagram.com/nilgun_oygur/">
              Instagram İçeriklerim ↗
            </a>
            <a href="https://www.youtube.com/@nilgunoygur4942">
              Youtube Videolarım ↗
            </a>
          </div>
        </Reveal>
        <Reveal>
          <h2>Odak Alanlarım</h2>
          <p>
            Bilgi ve tecrübelerimle size sunduğum eğitimlerde öğrenmenin ve
            doğru bilginin konforundan yararlanın.
          </p>
          <ul className="focus-list">
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
              <li key={s}>
                <Check />
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
