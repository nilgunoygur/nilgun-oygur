import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { config } from "@/lib/config";
import { ProfileSettings } from "@/components/akademi/profile-settings";
import { pageWidth, accountPage, kicker } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil ayarları", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <Suspense fallback={<main className={cn(pageWidth, accountPage)}><p className="text-stone">Profil yükleniyor…</p></main>}><ProfileContent /></Suspense>;
}

async function ProfileContent() {
  const viewer = await studentPage("/akademi/profil");
  return <main className={cn(pageWidth, accountPage)}>
    <div className="mx-auto max-w-2xl">
      <Link href="/akademi/hesabim" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Hesabıma dön</Link>
      <p className={kicker}>AKADEMİ · HESAP</p>
      <h1 className="mt-3 text-[clamp(36px,5vw,52px)]">Profil ayarları</h1>
      <p className="mt-3 mb-10 text-stone">Kişisel bilgilerinizi ve şifrenizi buradan yönetin.</p>
      <ProfileSettings user={viewer.user} localEmail={config().consoleEmail} />
    </div>
  </main>;
}
