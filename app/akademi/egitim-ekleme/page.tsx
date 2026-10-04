import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { accountCard, accountPage, kicker, pageWidth, textLink } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Satın aldığım eğitimi nasıl eklerim?", robots: { index: false, follow: false } };
const steps = [
  { title: "Shopier siparişinizi bulun", text: "Shopier’in gönderdiği sipariş onay e-postasını açın. Sipariş numaranızı ve alışverişte kullandığınız e-posta adresini not edin. E-postayı göremiyorsanız spam klasörünü de kontrol edin." },
  { title: "Akademi hesabınıza giriş yapın", text: "Hesabınız yoksa Shopier’de kullandığınız e-posta ile kayıt olun. Doğrulama e-postasındaki bağlantıya tıklayın, ardından giriş yapın. Aynı e-posta ile alınan eğitimler bildirim ulaştığında otomatik eklenir." },
  { title: "Gerekirse siparişinizi ekleyin", text: "Hesabım sayfasında eğitim görünmüyorsa “Shopier siparişimi ekle” seçeneğini açın. Sipariş numarasını ve Shopier’de kullandığınız e-postayı girin. Akademi hesabınız farklı bir e-posta kullanabilir." },
  { title: "Eğitiminize devam edin", text: "Sipariş doğrulandıktan sonra “Eğitimlerime git” düğmesine tıklayın. Hesabım sayfasındaki eğitim kartında “Eğitime devam et” seçeneğini kullanın." },
];

export default function AddCourseGuide() {
  return <main className={cn(pageWidth, accountPage)}><div className="mx-auto max-w-3xl">
    <p className={kicker}>AKADEMİ · EĞİTİM EKLEME REHBERİ</p>
    <h1 className="mt-4 text-[clamp(36px,5vw,54px)] leading-tight">Satın aldığım eğitimi<br />nasıl eklerim?</h1>
    <p className="mt-5 mb-10 max-w-xl leading-relaxed text-stone">Ödemeniz Shopier’de, eğitiminiz burada. Siparişinizi hesabınıza bağlamak için bu adımları izleyin.</p>
    <ol className="grid gap-5">{steps.map((step, index) => <li key={step.title} className={cn(accountCard, "flex gap-5")}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white" aria-hidden="true">{index + 1}</span><div><h2 className="text-2xl">{step.title}</h2><p className="mt-2 leading-relaxed text-stone">{step.text}</p></div></li>)}</ol>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/akademi/siparis-ekle" className={buttonVariants()}>Siparişimi ekle <ArrowUpRight className="size-4" aria-hidden="true" /></Link><Link href="/akademi/hesabim" className={buttonVariants({ variant: "outline" })}>Eğitimlerime git</Link></div>
    <div className="mt-12 border-t border-border pt-8"><h2 className="text-2xl">Hâlâ ekleyemiyor musunuz?</h2><div className="mt-4 grid gap-4 leading-relaxed text-stone"><p>Sipariş numarasını ve satın alma e-postasını tam olarak kontrol edin. Ödeme henüz onaylanmadıysa onaylandıktan sonra yeniden deneyin. Tamamen iade edilmiş siparişler eğitim erişimi sağlamaz.</p><p>Sipariş başka bir hesaba eklenmişse veya bilgileriniz doğru olduğu halde bulunamıyorsa sipariş numaranızla bize ulaşın. Şifrenizi ya da kart bilgilerinizi paylaşmayın.</p></div><Link href="/iletisim" className={cn(textLink, "mt-5 inline-flex")}>Yardım için iletişime geçin <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
  </div></main>;
}
