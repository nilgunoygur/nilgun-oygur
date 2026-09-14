import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Check, Camera, Video, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Reveal } from "@/components/reveal";
import { PhotoCarousel, ArticleCarousel } from "@/components/sliders";
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

export function Booking({
  label = "Ücretsiz İlk Görüşme için Tıklayın",
  credit = true,
}: {
  label?: string;
  credit?: boolean;
}) {
  return (
    <div className="booking">
      <a
        className={cn(buttonVariants({ variant: "glow", size: "hero" }))}
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
      {credit && (
        <span className="calendly">
          With <b>◉</b> Calendly
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
    <section className="hero page-width">
      <Reveal className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hero-description">{description}</p>
        <Booking label={contact ? "Şimdi Başlayalım" : undefined} />
      </Reveal>
      <Reveal className="hero-art" delay={0.12}>
        <div className="ribbon ribbon-one" />
        <div className="ribbon ribbon-two" />
        <div className="ribbon ribbon-three" />
        <div className="hero-photo">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 760px) 100vw, 46vw"
            preload
          />
        </div>
        {stats && (
          <div className="stats">
            <div>
              <strong>50+</strong>
              <span>Değişen Yaşam ❤️</span>
            </div>
            <Separator orientation="vertical" />
            <div>
              <strong>90+</strong>
              <span>Mutlu Danışan 😊</span>
            </div>
          </div>
        )}
      </Reveal>
    </section>
  );
}
export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <Reveal className="section-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
    </Reveal>
  );
}
export function About({ full = false }: { full?: boolean }) {
  const bio = pages["/nilgun-oygur"].text.slice(6, 11);
  return (
    <section className={cn("about-section page-width", full && "full-bio")}>
      <Reveal className="about-copy">
        <p className="eyebrow">{full ? "Tanışalım" : "Haydi Tanışalım"}</p>
        {full ? <h1>Nilgün Oygur</h1> : <h2>Benim Hakkımda</h2>}
        {full ? (
          bio.map((x) => <p key={x.text}>{x.text}</p>)
        ) : (
          <>
            <p>
              Merhaba ben spiritüel eğitmen ve psikoloji mezunu olarak kendi
              yaşamımda yaşadığım döngüleri ve tekrar eden olumsuzlukların ne
              olduğunu anlamaya ve çözmeye çalışırken sana yardımcı olacak
              ruhsal rehberin Nilgün Oygur.
            </p>
            <p>
              Benim misyonum; sizin var olan potansiyelinizi keşfetmenizi
              bütüncül bir yaklaşım ile sağlamak ve size bu konuda yardımcı
              olarak yol göstermektir.
            </p>
            <p>
              Eğer sizde bu yolda profesyonel ellerde olmak istiyorsanız sizi
              bütünsel şifa akademi ailesinde görmekten mutluluk duyarım.
            </p>
            <Link
              className={buttonVariants({ variant: "secondary", size: "pill" })}
              href="/nilgun-oygur"
            >
              Biyografimi İnceleyin <ArrowUpRight data-icon="inline-end" />
            </Link>
          </>
        )}
      </Reveal>
      <Reveal className="about-art">
        <Image
          src={asset(pages["/"].images[2])}
          alt="Nilgün Oygur"
          width={500}
          height={650}
          sizes="(max-width: 760px) 90vw, 40vw"
        />
        <span className="floating-label first">
          <Check /> Bütüncül Yaklaşım
        </span>
        <span className="floating-label second">
          <Check /> Kanıtlanmış Sonuçlar
        </span>
      </Reveal>
    </section>
  );
}
export function SocialSection() {
  return (
    <section className="social-section page-width">
      <Reveal>
        <Image
          src={asset(pages["/"].images[3])}
          alt="Nilgün Oygur Sosyal Medyaları"
          width={650}
          height={420}
          sizes="(max-width: 760px) 90vw, 50vw"
        />
      </Reveal>
      <Reveal>
        <p className="eyebrow">Beni İnternette Keşfedin</p>
        <h2>
          Dönüşüm Her Zaman
          <br /> İçeriden Gelir
        </h2>
        <div className="social-links">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "pill" })}
            >
              {s.label}
              <ArrowUpRight data-icon="inline-end" />
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
export function Journey({ gallery = true }: { gallery?: boolean }) {
  return (
    <section className="journey">
      <div className="page-width">
        <Reveal className="journey-copy">
          <p className="eyebrow">İletişime Geçin</p>
          <h2>Yolculuğunuzu başlatın</h2>
          <p>
            Benzersiz ihtiyaçlarınıza yönelik mükemmel yaşam koçu veya
            psikologla bağlantı kurmak için hızlı değerlendirmeme katılın.
          </p>
          <Booking label="Şimdi Başlayalım" credit={false} />
        </Reveal>
        {gallery && (
          <PhotoCarousel
            images={pages["/nilgun-oygur"].images.slice(4, 10).map(asset)}
          />
        )}
      </div>
    </section>
  );
}
export function BlogSection() {
  return (
    <section className="blog-section page-width">
      <Reveal className="blog-intro">
        <p className="eyebrow">Güncel</p>
        <h2>Yazılarım</h2>
        <p>{blogIntro}</p>
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
    <footer className="site-footer page-width">
      <div className="footer-grid">
        <Link className="brand" href="/">
          <Image src={logo} alt="" width={42} height={42} />
          <span>Nilgün Oygur</span>
        </Link>
        <div className="footer-column">
          <Link href="/">Anasayfa</Link>
          <Link href="/nilgun-oygur">Hakkımda</Link>
          <Link href="/kitaplarim">Kitaplarım</Link>
          <Link href="/blog">Yazılarım</Link>
        </div>
        <div className="footer-column">
          <Link href="/egitimlerim">Eğitimlerim</Link>
          {courses.map((c) => (
            <Link key={c.slug} href={c.href}>
              {c.title}
            </Link>
          ))}
        </div>
        <div className="footer-column">
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
      <p className="copyright">Nilgün Oygur © 2024.</p>
    </footer>
  );
}
