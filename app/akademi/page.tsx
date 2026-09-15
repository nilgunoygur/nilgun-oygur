import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen, Leaf } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { portrait } from "@/lib/content";
import { demoCourses as courses, demoPrice, demoCourseImage } from "@/lib/akademi/demo-courses";
import { PromoVideo } from "@/components/akademi/promo-video";

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
          <p className="academy-promotion-note">Yeni bir başlangıç, sizin ritminizde. Online eğitim deneyimini keşfedin.</p>
        </div>
        <figure className="academy-promotion-portrait">
          <Image src={portrait} alt="Nilgün Oygur" fill sizes="(max-width: 760px) 90vw, 480px" priority />
          <figcaption>Nilgün Oygur ile<br /><strong>öğrenmeye alan açın.</strong></figcaption>
        </figure>
      </section>

      <section className="academy-film-section page-width"><div><p className="academy-kicker">BİRKAÇ DAKİKALIĞINA KENDİNİZE DÖNÜN</p><h2>Bir eğitimden<br />daha fazlası.</h2><p>Yeni bir bakış açısı. Küçük bir günlük pratik. Kendiniz için ayırdığınız bir an. Akademi’nin dünyasına kısa bir bakış.</p><p className="academy-demo-label">Örnek tanıtım videosu — final anlatım hazırlanıyor.</p></div><PromoVideo /></section>

      <section id="egitimler" className="academy-offerings page-width" aria-labelledby="academy-courses">
        <div className="academy-section-heading">
          <div><p className="academy-kicker">MERAKINIZIN PEŞİNDEN GİDİN</p><h2 id="academy-courses">Yolculuğunuz nereden başlasın?</h2></div>
          <p>İlginizi çeken konuyu seçin; programın içeriğini ve size uygun olup olmadığını birlikte keşfedelim.</p>
        </div>
        <div className="academy-offering-grid">
          {courses.map((course, index) => (
            <article className="academy-offering" key={course.slug}>
              <Link href={`/akademi/${course.slug}`} className="academy-offering-image" aria-label={course.title + " programını incele"}>
                <Image src={demoCourseImage(course.image)} alt="" fill sizes="(max-width: 760px) 90vw, 580px" />
                <span>0{index + 1}</span>
              </Link>
              <div className="academy-offering-body">
                <p className="academy-kicker">{course.category} · ONLINE EĞİTİM</p>
                <h3><Link href={`/akademi/${course.slug}`}>{course.title}</Link></h3>
                <p>{course.description}</p>
                <div className="academy-course-meta"><span>{course.lessons} ders</span><span>{course.duration}</span><span>12 ay erişim</span></div><div className="academy-card-bottom"><div><small>Örnek fiyat</small><strong>{demoPrice(course.price)}</strong></div><Link href={`/akademi/${course.slug}`} className={buttonVariants({ size: "pill" })}>Eğitimi keşfet <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
              </div>
            </article>
          ))}
        </div>
        <div className="academy-sales-note"><BookOpen aria-hidden="true" /><p>Demo vitrin: fiyatlar, ders sayıları ve süreler örnektir. Satın alma akışı denenebilir; ödeme alınmaz ve eğitim erişimi oluşturulmaz.</p></div>
      </section>

      <section className="academy-how page-width" aria-labelledby="academy-how-title">
        <p className="academy-kicker">ADIM ADIM AKADEMİ</p>
        <h2 id="academy-how-title">Meraktan öğrenmeye.</h2>
        <div className="academy-how-grid">
          <div><span>01</span><h3>Eğitiminizi keşfedin</h3><p>Programları inceleyin. İçeriği, yaklaşımı ve ilgi alanlarınıza uygunluğunu değerlendirin.</p></div>
          <div><span>02</span><h3>Katılımınızı planlayın</h3><p>Eğitiminizin sayfasından örnek satın alma akışını deneyin. Demo sırasında ödeme bilgisi istenmez.</p></div>
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
