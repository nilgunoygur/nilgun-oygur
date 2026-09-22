import type { Metadata } from "next";
import { Phone, Mail } from "lucide-react";
import { Hero, SectionHeading } from "@/components/site";
import { ContactForm } from "@/components/contact-form";
import { asset, pages, email, socials } from "@/lib/content";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
const contactLine = "mb-[18px] flex items-center gap-3 text-[15px] [overflow-wrap:anywhere] max-tablet:text-[13px]";

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
      <section className={cn(pageWidth, "pt-10 pb-[120px] max-tablet:pt-5 max-tablet:pb-[70px]")}>
        <SectionHeading title="Haydi Konuşalım" className="mb-6 max-tablet:mb-6" />
        <p className="mx-auto mb-[65px] max-w-[820px] text-center text-[20px] max-tablet:text-[17px]">
          Sesiniz önemlidir ve biz sizi dinlemek için buradayız. Sorularınız
          varsa, rehberliğe ihtiyacınız varsa veya yalnızca bağlantı kurmak
          istiyorsanız ekibimiz sizi desteklemeye hazırdır.
          <br />
          <br />
          Bugün konuşalım.
        </p>
        <div className="m-auto grid max-w-[1100px] grid-cols-[1fr_1.15fr] gap-20 max-laptop:gap-10 max-tablet:grid-cols-1 max-tablet:gap-[35px] [&_form]:py-[10px] [&_input]:min-h-12 [&_textarea]:min-h-40">
          <div className="min-h-[350px] self-start rounded-[24px] bg-[linear-gradient(100deg,#778ac0,#4b999c)] p-10 text-white max-tablet:min-h-80 max-tablet:p-[30px]">
            <h3 className="mb-[10px] text-[28px]">İletişim bilgileri</h3>
            <p className="mb-[34px] text-[16px] text-[#ffffffbf]">Formu doldurun, 24 saat içinde size geri döneceğiz.</p>
            <a href="tel:+905305004822" className={contactLine}>
              <Phone size={18} className="shrink-0" />
              +90 530 500 48 22
            </a>
            <a href={`mailto:${email}`} className={contactLine}>
              <Mail size={18} className="shrink-0" />
              {email}
            </a>
            <div className="mt-12 flex flex-wrap gap-[10px] text-[14px] max-tablet:mt-6 max-tablet:gap-2">
              {socials.map((s) => (
                <a key={s.href} href={s.href} className="min-h-14 rounded-[24px] bg-white px-5 py-[14px] text-[20px] font-normal text-foreground pointer-fine:hover:bg-[#f4faf8] max-tablet:min-h-11 max-tablet:px-3 max-tablet:py-[10px] max-tablet:text-[15px]">
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
