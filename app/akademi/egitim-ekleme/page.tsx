import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CourseAddExample } from "@/components/akademi/course-add-examples";
import { accountCard, accountPage, kicker, pageWidth, textLink } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Satın aldığım eğitimi nasıl eklerim?", robots: { index: false, follow: false } };
const steps = [
  { id: "siparis", kind: "purchase", title: "Shopier siparişinizi bulun", text: "Shopier’in gönderdiği sipariş onay e-postasını açın. Sipariş numaranızı ve alışverişte kullandığınız e-posta adresini not edin. E-postayı göremiyorsanız spam klasörünü de kontrol edin." },
  { id: "hesap", kind: "account", title: "Akademi hesabınıza giriş yapın", text: "Hesabınız yoksa Shopier’de kullandığınız e-posta ile kayıt olun. Doğrulama e-postasındaki bağlantıya tıklayın, ardından giriş yapın. Aynı e-posta ile alınan eğitimler bildirim ulaştığında otomatik eklenir." },
  { id: "ekleme", kind: "claim", title: "Gerekirse siparişinizi ekleyin", text: "Hesabım sayfasında eğitim görünmüyorsa “Shopier siparişimi ekle” seçeneğini açın. Sipariş numarasını ve Shopier’de kullandığınız e-postayı girin. Akademi hesabınız farklı bir e-posta kullanabilir." },
  { id: "dersler", kind: "course", title: "Eğitiminize devam edin", text: "Sipariş doğrulandıktan sonra “Eğitimlerime git” düğmesine tıklayın. Hesabım sayfasındaki eğitim kartında “Eğitime devam et” seçeneğini kullanın." },
] as const;

export default function AddCourseGuide() {
  return <section className={cn(pageWidth, accountPage)}><div className="mx-auto max-w-3xl">
    <p className={kicker}>AKADEMİ · EĞİTİM EKLEME REHBERİ</p>
    <h1 className="mt-4 text-[clamp(36px,5vw,54px)] leading-tight">Satın aldığım eğitimi<br />nasıl eklerim?</h1>
    <p className="mt-5 mb-10 max-w-xl leading-relaxed text-stone">Ödemeniz Shopier’de, eğitiminiz burada. Siparişinizi hesabınıza bağlamak için bu adımları izleyin.</p>
    <div className="mb-8 flex flex-wrap gap-3"><Link href="/akademi/siparis-ekle" className={buttonVariants({ size: "pill" })}>Sipariş bilgilerim hazır, eğitimi ekle</Link><Link href="/akademi/hesabim" className={buttonVariants({ size: "pill", variant: "outline" })}>Eğitimlerime git</Link></div>
    <nav aria-label="Rehber adımları" className="mb-8 flex flex-wrap gap-2">{steps.map((step, index) => <Link key={step.id} href={`#${step.id}`} className="rounded-full border border-forest/15 bg-mist px-4 py-2 text-xs text-forest hover:bg-sage">{index + 1}. {step.title}</Link>)}</nav>
    <ol className="grid gap-6">{steps.map((step, index) => <li id={step.id} key={step.title} className={cn(accountCard, "scroll-mt-36")}><div className="flex items-start gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white" aria-hidden="true">{index + 1}</span><div><h2 className="text-2xl">{step.title}</h2><p className="mt-2 leading-relaxed text-stone">{step.text}</p></div></div><CourseAddExample kind={step.kind} /></li>)}</ol>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/akademi/siparis-ekle" className={buttonVariants()}>Siparişimi ekle <ArrowUpRight className="size-4" aria-hidden="true" /></Link><Link href="/akademi/hesabim" className={buttonVariants({ variant: "outline" })}>Eğitimlerime git</Link></div>
    <div className="mt-10 grid gap-3">
      <details className={accountCard}><summary className="cursor-pointer font-medium text-forest">Ödeme yaptım ama eğitimim görünmüyor.</summary><p className="mt-4 leading-relaxed text-stone">Önce Akademi hesabınızın e-postasını doğruladığınızdan emin olun. Shopier sipariş onayınız geldiyse otomatik eklenmesini beklemeden sipariş numarası ve satın alma e-postasıyla ekleyebilirsiniz.</p><Link href="/akademi/siparis-ekle" className={cn(textLink, "mt-4")}>Siparişimi ekle</Link></details>
      <details className={accountCard}><summary className="cursor-pointer font-medium text-forest">Shopier’de başka bir e-posta kullandım.</summary><p className="mt-4 leading-relaxed text-stone">Mevcut Akademi hesabınızla giriş yapın. Sipariş ekleme formundaki e-posta alanını Shopier’de kullandığınız adresle değiştirin. Sipariş başka bir Akademi hesabına eklenmemişse bu hesabınıza bağlanabilir.</p></details>
      <details className={accountCard}><summary className="cursor-pointer font-medium text-forest">Doğrulama e-postasını bulamıyorum.</summary><p className="mt-4 leading-relaxed text-stone">Spam ve gereksiz e-posta klasörlerini kontrol edin. Adresiniz doğruysa yeni bir doğrulama e-postası isteyin ve en son gelen bağlantıyı kullanın.</p><Link href="/akademi/dogrulama?next=%2Fakademi%2Fhesabim" className={cn(textLink, "mt-4")}>Doğrulama e-postasını yeniden gönder</Link></details>
    </div>
    <div className="mt-12 border-t border-border pt-8"><h2 className="text-2xl">Hâlâ ekleyemiyor musunuz?</h2><div className="mt-4 grid gap-4 leading-relaxed text-stone"><p>Sipariş numarasını ve satın alma e-postasını tam olarak kontrol edin. Ödeme henüz onaylanmadıysa onaylandıktan sonra yeniden deneyin. Tamamen iade edilmiş siparişler eğitim erişimi sağlamaz.</p><p>Sipariş başka bir hesaba eklenmişse veya bilgileriniz doğru olduğu halde bulunamıyorsa sipariş numaranızla bize ulaşın. Şifrenizi ya da kart bilgilerinizi paylaşmayın.</p></div><Link href="/iletisim" className={cn(textLink, "mt-5 inline-flex")}>Yardım için iletişime geçin <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
  </div></section>;
}
