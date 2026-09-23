import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { articleBodyText, getArticleImageLibrary, getManagedArticle, slugOf } from "@/lib/articles";
import { pageWidth, backLink, ownerKicker, ownerPanel, ownerSection, ownerTitle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleForm } from "@/components/akademi/article-form";

type Props = { params: Promise<{ slug: string }> };
export const metadata = { title: "Yazı düzenle" };
export default function ArticleEditor({ params }: Props) {
  return <section className={cn(pageWidth, ownerSection)}><Suspense fallback={<p className="text-stone">Düzenleyici yükleniyor…</p>}><Editor params={params} /></Suspense></section>;
}
async function Editor({ params }: Props) {
  await ownerPage();
  const { slug } = await params;
  const isNew = slug === "yeni";
  const [managed, imageChoices] = await Promise.all([isNew ? null : getManagedArticle(slug), getArticleImageLibrary()]);
  if (!isNew && !managed) notFound();
  const article = managed?.article;
  if (article && !imageChoices.some(choice => choice.url === article.image)) imageChoices.unshift({ url: article.image, name: "Mevcut kapak" });
  return <>
    <Link href="/yonetim/yazilar" className={backLink}><ArrowLeft className="size-4" /> Tüm yazılar</Link>
    <header className="mb-8"><p className={ownerKicker}>İÇERİK YÖNETİMİ</p><h1 className={ownerTitle}>{isNew ? "Yeni yazı" : "Yazıyı düzenle"}</h1>{article && managed?.status === "published" && <Link href={article.href} target="_blank" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Yazıyı görüntüle <ExternalLink className="size-3" /></Link>}</header>
    <Card className={ownerPanel}><CardContent><ArticleForm initialImages={imageChoices} article={article ? { title: article.title, slug: slugOf(article), category: article.category, image: article.image, date: article.date, duration: article.duration, body: articleBodyText(article) } : undefined} /></CardContent></Card>
  </>;
}
