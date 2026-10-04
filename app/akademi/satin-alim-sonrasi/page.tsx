import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, MailCheck, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { accountCard, accountPage, kicker, pageWidth, textLink } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Satın aldığınız eğitime ulaşın", robots: { index: false, follow: false } };
const next = encodeURIComponent("/akademi/hesabim");

export default function PurchaseReturnPage() {
  return <main className={cn(pageWidth, accountPage)}>
    <div className="mx-auto max-w-3xl">
      <p className={kicker}>AKADEMİ · SATIN ALIM SONRASI</p>
      <h1 className="mt-4 max-w-xl text-[clamp(38px,5vw,60px)] leading-tight">Eğitiminizle<br /><em className="text-forest">buluşma zamanı.</em></h1>
      <p className="mt-5 mb-9 max-w-xl leading-relaxed text-stone">Shopier’den satın aldığınız eğitime Nilgün Oygur Akademi hesabınızdan ulaşabilirsiniz. Ödemeniz onaylandıktan sonra eğitiminiz hesabınızda görünür.</p>
      <div className={cn(accountCard, "bg-mist")}>
        <BookOpen className="mb-4 size-7 text-forest" aria-hidden="true" />
        <h2 className="text-2xl">Hesabınıza girin, eğitiminize başlayın.</h2>
        <p className="mt-3 mb-6 leading-relaxed">Ödeme sırasında kullandığınız e-posta ile giriş yapın. Hesabınız yoksa aynı adresle kayıt olun ve doğrulama e-postasındaki bağlantıya tıklayın.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/akademi/giris?next=${next}`} className={buttonVariants()}>Giriş yap <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          <Link href={`/akademi/kayit?next=${next}`} className={buttonVariants({ variant: "outline" })}>Hesap oluştur</Link>
          <Link href="/akademi/hesabim" className={buttonVariants({ variant: "outline" })}>Eğitimlerime git</Link>
        </div>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className={accountCard}><ShoppingBag className="mb-4 size-6 text-forest" aria-hidden="true" /><h2 className="text-2xl">Eğitiminiz görünmüyor mu?</h2><p className="mt-3 mb-5 leading-relaxed text-stone">Bildirim henüz ulaşmadıysa veya Shopier’de farklı bir e-posta kullandıysanız sipariş numaranız ve satın alma e-postanızla eğitimi ekleyin.</p><Link href="/akademi/siparis-ekle" className={textLink}>Shopier siparişimi ekle <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
        <div className={accountCard}><MailCheck className="mb-4 size-6 text-forest" aria-hidden="true" /><h2 className="text-2xl">Adım adım yardım</h2><p className="mt-3 mb-5 leading-relaxed text-stone">Sipariş numarasını nerede bulacağınızı, e-postanızı nasıl doğrulayacağınızı ve eğitimi nasıl ekleyeceğinizi öğrenin.</p><Link href="/akademi/egitim-ekleme" className={textLink}>Eğitim ekleme rehberi <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
      </div>
    </div>
  </main>;
}
