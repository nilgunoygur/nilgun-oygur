import { PageLoader } from "@/components/ui/spinner";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { ClaimOrderForm } from "@/components/akademi/claim-order-form";
import { CourseAddExample } from "@/components/akademi/course-add-examples";
import { pageWidth, accountPage, kicker, accountCard } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shopier siparişi ekle", robots: { index: false, follow: false } };

export default function ClaimPage() {
  return <Suspense fallback={<main className={cn(pageWidth, accountPage)}><PageLoader label="Sipariş sayfası yükleniyor" /></main>}><ClaimContent /></Suspense>;
}

async function ClaimContent() {
  const viewer = await studentPage("/akademi/siparis-ekle");
  return <main className={cn(pageWidth, accountPage)}>
    <div className="mx-auto max-w-2xl">
      <Link href="/akademi/hesabim" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Hesabıma dön</Link>
      <p className={kicker}>AKADEMİ · SİPARİŞ</p>
      <h1 className="mt-3 text-[clamp(36px,5vw,52px)]">Shopier siparişinizi ekleyin</h1>
      <p className="mt-3 mb-10 text-stone">Satın aldığınız eğitimi hesabınıza bağlamak için sipariş bilgilerinizi doğrulayın.</p>
      <p className="mb-6 text-sm text-stone">Shopier sipariş onay e-postanızdaki sipariş numarasını ve satın alırken kullandığınız e-posta adresini girin. Akademi hesabınızın e-postası farklı olabilir. <Link href="/akademi/egitim-ekleme" className="text-forest underline underline-offset-4">Adım adım yardım</Link></p>
      <div className={accountCard}>
        <ClaimOrderForm defaultEmail={viewer.user.email} />
      </div>
      <details className="mt-6 rounded-[20px] border border-forest/10 bg-white p-5"><summary className="cursor-pointer text-sm font-medium text-forest">Sipariş numaramı nerede bulabilirim?</summary><p className="mt-4 text-sm leading-relaxed text-stone">Shopier sipariş onay e-postanızdaki sipariş numarasını bulun. Aşağıdaki örnekte vurgulanan alanı kendi e-postanızda arayın.</p><CourseAddExample kind="purchase" /></details>
    </div>
  </main>;
}
