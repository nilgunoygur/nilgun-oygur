import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getManagedBanner } from "@/lib/banner";
import { pageWidth, backLink, ownerKicker, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { BannerEditor } from "./banner-editor";

export const metadata = { title: "Banner yönetimi" };

export default function BannerManagement() {
  return <section className={cn(pageWidth, ownerSection)}>
    <Suspense fallback={<p className="text-stone">Banner ayarları yükleniyor…</p>}><Content /></Suspense>
  </section>;
}

async function Content() {
  await ownerPage();
  const settings = await getManagedBanner();
  return <>
    <Link href="/yonetim" className={backLink}><ArrowLeft className="size-4" /> Genel bakış</Link>
    <header className="mb-9"><p className={ownerKicker}>SİTE YÖNETİMİ</p><h1 className={ownerTitle}>Banner yönetimi</h1><p className="mt-2 text-[16px] text-stone">Sitenin üstündeki duyuru şeridini düzenleyin ve yayınlayın.</p></header>
    <BannerEditor initial={settings.draft} initiallyPublished={settings.isPublished} />
  </>;
}
