import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getManagedBanner } from "@/lib/banner";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { BannerEditor } from "./banner-editor";

export const metadata = { title: "Banner yönetimi" };

export default function BannerManagement() {
  return <section className={cn(pageWidth, "min-h-[75vh] pt-[150px] pb-24 max-tablet:pt-[130px]")}>
    <Suspense fallback={<p className="text-stone">Banner ayarları yükleniyor…</p>}><Content /></Suspense>
  </section>;
}

async function Content() {
  await ownerPage();
  const settings = await getManagedBanner();
  return <>
    <Link href="/yonetim" className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Genel bakış</Link>
    <header className="mb-9"><p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-forest">SİTE YÖNETİMİ</p><h1 className="text-[clamp(38px,4vw,58px)]">Banner yönetimi</h1><p className="mt-2 text-[16px] text-stone">Sitenin üstündeki duyuru şeridini düzenleyin ve yayınlayın.</p></header>
    <BannerEditor initial={settings.draft} initiallyPublished={settings.isPublished} />
  </>;
}
