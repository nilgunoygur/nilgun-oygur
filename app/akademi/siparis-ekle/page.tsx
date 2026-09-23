import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { ClaimOrderForm } from "@/components/akademi/claim-order-form";
import { pageWidth, accountPage, kicker, accountCard } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shopier siparişi ekle", robots: { index: false, follow: false } };

export default function ClaimPage() {
  return <Suspense fallback={<main className={cn(pageWidth, accountPage)}><p className="text-stone">Sipariş sayfası yükleniyor…</p></main>}><ClaimContent /></Suspense>;
}

async function ClaimContent() {
  await studentPage("/akademi/siparis-ekle");
  return <main className={cn(pageWidth, accountPage)}>
    <div className="mx-auto max-w-2xl">
      <Link href="/akademi/hesabim" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Hesabıma dön</Link>
      <p className={kicker}>AKADEMİ · SİPARİŞ</p>
      <h1 className="mt-3 text-[clamp(36px,5vw,52px)]">Shopier siparişinizi ekleyin</h1>
      <p className="mt-3 mb-10 text-stone">Satın aldığınız eğitimi hesabınıza bağlamak için sipariş bilgilerinizi doğrulayın.</p>
      <div className={accountCard}>
        <ClaimOrderForm />
      </div>
    </div>
  </main>;
}
