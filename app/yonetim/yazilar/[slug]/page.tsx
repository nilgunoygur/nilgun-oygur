import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { articleBodyText, getManagedArticle } from "@/lib/articles";
import { articles } from "@/lib/content";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveArticle } from "../actions";

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
  const imageChoices = new Map(articles.map(item => [item.image, item.title]));
  if (article && !imageChoices.has(article.image)) imageChoices.set(article.image, "Mevcut kapak");
  const today = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date());
  return <>
    <Link href="/yonetim/yazilar" className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-forest hover:underline"><ArrowLeft className="size-4" /> Tüm yazılar</Link>
    <header className="mb-8"><p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-forest">İÇERİK YÖNETİMİ</p><h1 className="text-[clamp(38px,4vw,58px)]">{isNew ? "Yeni yazı" : "Yazıyı düzenle"}</h1>{article && managed?.status === "published" && <Link href={article.href} target="_blank" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Yazıyı görüntüle <ExternalLink className="size-3" /></Link>}</header>
    <Card className="rounded-[26px] border-forest/10 bg-white py-6 shadow-[0_12px_40px_-30px_rgba(34,76,64,0.4)] sm:py-8"><CardContent><form action={saveArticle}>
      <FieldGroup className="grid gap-6 sm:grid-cols-2">
        <Field className="sm:col-span-2"><FieldLabel htmlFor="article-title">Başlık</FieldLabel><Input id="article-title" className="h-11" name="title" defaultValue={article?.title} required maxLength={180} /></Field>
        <Field><FieldLabel htmlFor="article-slug">URL adı</FieldLabel><Input id="article-slug" className="h-11" name="slug" defaultValue={article?.href.slice(6)} readOnly={!isNew} required pattern="[a-z0-9-]+" placeholder="ornek-yazi-basligi" /><FieldDescription>Yeni yazılarda küçük harf ve kısa çizgi kullanın.</FieldDescription></Field>
        <Field><FieldLabel htmlFor="article-category">Kategori</FieldLabel><Input id="article-category" className="h-11" name="category" defaultValue={article?.category} required maxLength={70} /></Field>
        <Field><FieldLabel htmlFor="article-date">Tarih etiketi</FieldLabel><Input id="article-date" className="h-11" name="dateLabel" defaultValue={article?.date ?? today} required maxLength={50} /></Field>
        <Field><FieldLabel htmlFor="article-duration">Okuma süresi</FieldLabel><Input id="article-duration" className="h-11" name="duration" defaultValue={article?.duration ?? "5 dk."} required maxLength={30} /></Field>
        <Field className="sm:col-span-2"><FieldLabel htmlFor="article-image">Kapak görseli</FieldLabel><NativeSelect id="article-image" className="w-full [&_select]:h-11" name="image" defaultValue={article?.image ?? articles[0].image}>{[...imageChoices].map(([image, title]) => <NativeSelectOption key={image} value={image}>{title}</NativeSelectOption>)}</NativeSelect><FieldDescription>Mevcut yazıların kapaklarından seçin.</FieldDescription></Field>
        <Field className="sm:col-span-2"><FieldLabel htmlFor="article-body">Yazı içeriği</FieldLabel><Textarea id="article-body" className="min-h-[360px] resize-y px-4 py-4 leading-7" name="body" defaultValue={article ? articleBodyText(article) : ""} required minLength={40} /><FieldDescription>Paragrafları boş satırla ayırın. Ara başlık için satırın başına ## ekleyin.</FieldDescription></Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2"><Button name="status" value="draft" variant="outline" size="pill">Taslak olarak kaydet</Button><Button name="status" value="published" size="pill">Yayınla</Button></div>
      </FieldGroup>
    </form></CardContent></Card>
  </>;
}
