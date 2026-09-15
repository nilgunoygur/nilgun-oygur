import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen, Leaf } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { courses, portrait } from "@/lib/content";

export const metadata: Metadata = {
  title: "Akademi",
  description: "Nilgün Oygur Akademi eğitimlerini keşfedin. Kuantum, bioenerji, doğal taş ve regresyon programlarını inceleyin; öğrenme yolculuğunuza alan açın.",
  alternates: { canonical: "/akademi" },
};

export default function Academy() {
  return (
    <div className="academy-landing">
      <section className="academy-promotion page-width">
        <div className="academy-promotion-copy">
          <p className="academy-kicker"><Leaf size={17} aria-hidden="true" /> NİLGÜN OYGUR AKADEMİ</p>
          <h1>Kendinize açılan<br /><em>yeni bir kapı.</em></h1>
          <p>Merakla başlayın, öğrenerek derinleşin. Kendinizi keşfetme yolculuğunuzda size eşlik edecek eğitimlerle tanışın.</p>
          <div className="academy-promotion-actions">
            <Link href="#egitimler" className={buttonVariants({ size: "hero", variant: "default" })}>Eğitimleri keşfet <ArrowDown size={18} aria-hidden="true" /></Link>
            <Link href="/akademi/giris" className={buttonVariants({ size: "pill", variant: "outline" })}>Öğrenci girişi <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          <p className="academy-promotion-note">Akademi’nin online eğitim alanı yakında. Şimdiden programları keşfedebilirsiniz.</p>
        </div>
        <figure className="academy-promotion-portrait">
          <Image src={portrait} alt="Nilgün Oygur" fill sizes="(max-width: 760px) 90vw, 480px" priority />
          <figcaption>Nilgün Oygur ile<br /><strong>öğrenmeye alan açın.</strong></figcaption>
        </figure>
      </section>

      <section id="egitimler" className="academy-offerings page-width" aria-labelledby="academy-courses">
        <div className="academy-section-heading">
          <div><p className="academy-kicker">MERAKINIZIN PEŞİNDEN GİDİN</p><h2 id="academy-courses">Yolculuğunuz nereden başlasın?</h2></div>
          <p>İlginizi çeken konuyu seçin; programın içeriğini ve size uygun olup olmadığını birlikte keşfedelim.</p>
        </div>
        <div className="academy-offering-grid">
          {courses.map((course, index) => (
            <article className="academy-offering" key={course.slug}>
              <Link href={course.href} className="academy-offering-image" aria-label={course.title + " programını incele"}>
                <Image src={course.cardImage} alt="" fill sizes="(max-width: 760px) 90vw, 580px" />
                <span>0{index + 1}</span>
              </Link>
              <div className="academy-offering-body">
                <p className="academy-kicker">ONLINE SATIŞ YAKINDA</p>
                <h3><Link href={course.href}>{course.title}</Link></h3>
                <p>{course.description}</p>
                <Link href={course.href} className="academy-text-link">Programı incele <ArrowUpRight size={18} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
        <div className="academy-sales-note"><BookOpen aria-hidden="true" /><p>Online satın alma henüz açılmadı. Eğitimlerin katılım koşulları ve güncel tarihleri için <Link href="/iletisim">bizimle iletişime geçin.</Link></p></div>
      </section>

      <section className="academy-how page-width" aria-labelledby="academy-how-title">
        <p className="academy-kicker">ADIM ADIM AKADEMİ</p>
        <h2 id="academy-how-title">Meraktan öğrenmeye.</h2>
        <div className="academy-how-grid">
          <div><span>01</span><h3>Eğitiminizi keşfedin</h3><p>Programları inceleyin. İçeriği, yaklaşımı ve ilgi alanlarınıza uygunluğunu değerlendirin.</p></div>
          <div><span>02</span><h3>Katılımınızı planlayın</h3><p>Şimdilik sorularınız için bize ulaşabilirsiniz. Online satış açıldığında eğitiminizi buradan satın alabileceksiniz.</p></div>
          <div><span>03</span><h3>Hesabınızdan devam edin</h3><p>Akademi açıldığında, satın aldığınız eğitimlere öğrenci girişi üzerinden kendi hesabınızdan ulaşabileceksiniz.</p></div>
        </div>
      </section>

      <section className="academy-return page-width">
        <div><p className="academy-kicker">KİŞİSEL ÖĞRENME ALANINIZ</p><h2>Yolculuğunuza devam edin.</h2><p>Hesabınıza giriş yaparak eğitim alanınıza ulaşın.</p></div>
        <Link href="/akademi/giris" className={buttonVariants({ size: "hero" })}>Öğrenci girişi <ArrowUpRight aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
