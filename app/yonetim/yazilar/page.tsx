import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FilePlus2 } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getManagedArticles, slugOf } from "@/lib/articles";
import { pageWidth, backLink, ownerKicker, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Yazı yönetimi" };
export default function OwnerArticles() {
  return <section className={cn(pageWidth, ownerSection)}><Suspense fallback={<p className="text-stone">Yazılar yükleniyor…</p>}><Content /></Suspense></section>;
}
async function Content() {
  await ownerPage();
  const rows = await getManagedArticles();
  return <>
    <Link href="/yonetim" className={backLink}><ArrowLeft className="size-4" /> Genel bakış</Link>
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6"><div><p className={ownerKicker}>İÇERİK YÖNETİMİ</p><h1 className={ownerTitle}>Yazılarım</h1><p className="mt-2 text-[16px] text-stone">Yazıları düzenleyin, taslak olarak saklayın veya yayınlayın.</p></div><Button render={<Link href="/yonetim/yazilar/yeni" />} size="pill"><FilePlus2 className="size-4" /> Yeni yazı</Button></header>
    <Card className="rounded-[26px] border-forest/10 bg-white py-0 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)]"><CardContent className="px-0">
      {rows.map(({ article, status, imported }) => <Link key={article.href} href={`/yonetim/yazilar/${encodeURIComponent(slugOf(article))}`} className="group flex flex-wrap items-center gap-4 border-b border-forest/10 px-6 py-5 last:border-b-0 hover:bg-mist/60 sm:px-8"><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-primary">{article.category.toLocaleUpperCase("tr-TR")}</div><strong className="block text-[17px] font-semibold text-foreground">{article.title}</strong><span className="mt-1 block text-[12px] text-stone">{imported ? "Mevcut yazı" : "Yeni yazı"} · {article.date}</span></div><Badge variant={status === "published" ? "secondary" : "outline"}>{status === "published" ? "Yayında" : "Taslak"}</Badge><ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" /></Link>)}
    </CardContent></Card>
  </>;
}
