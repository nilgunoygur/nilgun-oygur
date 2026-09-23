import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { articleBodyText, getArticleImageLibrary, getManagedArticle } from "@/lib/articles";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleForm } from "@/components/akademi/article-form";

type Props = { params: Promise<{ slug: string }> };
export const metadata = { title: "Yazı düzenle" };
export default function ArticleEditor({ params }: Props) {
  return <section className={cn(pageWidth, "min-h-[75vh] pt-[150px] pb-24 max-tablet:pt-[130px]")}><Suspense fallback={<p className="text-stone">Düzenleyici yükleniyor…</p>}><Editor params={params} /></Suspense></section>;
}
async function Editor({ params }: Props) {
  await ownerPage();
  const { slug } = await params;
  const isNew = slug === "yeni";
  const managed = isNew ? null : await getManagedArticle(slug);
  if (!isNew && !managed) notFound();
  const article = managed?.article;
  const imageChoices = await getArticleImageLibrary();
  if (article && !imageChoices.some(choice => choice.url === article.image)) imageChoices.unshift({ url: article.image, name: "Mevcut kapak" });
  return <>
    <Link href="/yonetim/yazilar" className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Tüm yazılar</Link>
    <header className="mb-8"><p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-forest">İÇERİK YÖNETİMİ</p><h1 className="text-[clamp(38px,4vw,58px)]">{isNew ? "Yeni yazı" : "Yazıyı düzenle"}</h1>{article && managed?.status === "published" && <Link href={article.href} target="_blank" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Yazıyı görüntüle <ExternalLink className="size-3" /></Link>}</header>
    <Card className="rounded-[26px] border-forest/10 bg-white py-6 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)] sm:py-8"><CardContent><ArticleForm initialImages={imageChoices} article={article ? { title: article.title, slug: article.href.slice(6), category: article.category, image: article.image, date: article.date, duration: article.duration, body: articleBodyText(article) } : undefined} /></CardContent></Card>
  </>;
}
