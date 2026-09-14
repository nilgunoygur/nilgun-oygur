import type { Metadata } from "next";
import { Phone, Mail } from "lucide-react";
import { Hero, SectionHeading } from "@/components/site";
import { ContactForm } from "@/components/contact-form";
import { asset, pages, email, socials } from "@/lib/content";
export const metadata: Metadata = { title: "İletişim" };
export default function Contact() {
  return (
    <>
      <Hero
        eyebrow="Şimdi"
        title="Bana Ulaşın"
        description={
          '"Farkındalık, kabullenmeyi keşfettiğimiz, şefkati beslediğimiz ve sınırsız neşe ve iç huzuru ortaya çıkardığımız, mevcut olma sanatıdır."'
        }
        image={asset(pages["/iletisim"].images[1])}
        contact
      />
      <section className="contact-section page-width">
        <SectionHeading title="Haydi Konuşalım" />
        <p className="contact-intro">
          Sesiniz önemlidir ve biz sizi dinlemek için buradayız. Sorularınız
          varsa, rehberliğe ihtiyacınız varsa veya yalnızca bağlantı kurmak
          istiyorsanız ekibimiz sizi desteklemeye hazırdır.
          <br />
          <br />
          Bugün konuşalım.
        </p>
        <div className="contact-grid">
          <div className="contact-info">
            <h3>İletişim bilgileri</h3>
            <p>Formu doldurun, 24 saat içinde size geri döneceğiz.</p>
            <a href="tel:+905305004822">
              <Phone size={18} />
              +90 530 500 48 22
            </a>
            <a href={`mailto:${email}`}>
              <Mail size={18} />
              {email}
            </a>
            <div className="social-links">
              {socials.map((s) => (
                <a key={s.href} href={s.href}>
                  {s.label} ↗
                </a>
              ))}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
