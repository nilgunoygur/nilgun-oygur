"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { saveArticle } from "@/app/yonetim/yazilar/actions";
import { articleSlug } from "@/lib/akademi/slug";
import { ArticleRichEditor } from "@/components/akademi/article-rich-editor";
import { ImageLibrary, ImageUploadButton, imageRules, type ImageChoice } from "@/components/akademi/image-library";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ArticleValues = { title: string; slug: string; category: string; image: string; date: string; duration: string; body: string };

const iso = (date: Date) => format(date, "yyyy-MM-dd");
const turkishMonths = ["oca", "şub", "mar", "nis", "may", "haz", "tem", "ağu", "eyl", "eki", "kas", "ara"];
function dateFromLabel(label?: string) {
  if (label) {
    const match = label.toLocaleLowerCase("tr-TR").match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
    const month = match ? turkishMonths.findIndex(value => match[2].startsWith(value)) : -1;
    if (match && month >= 0) return new Date(Number(match[3]), month, Number(match[1]));
  }
  return new Date();
}

export function ArticleForm({ article, initialImages }: { article?: ArticleValues; initialImages: ImageChoice[] }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [date, setDate] = useState<Date>(() => dateFromLabel(article?.date));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [images, setImages] = useState(initialImages);
  const [image, setImage] = useState(article?.image ?? initialImages[0]?.url ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const durationMatch = article?.duration.match(/^(\d+)\s*(saat|dk)/i);

  async function uploadImage(file: File): Promise<ImageChoice | null> {
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/yonetim/article-images", { method: "POST", body: data });
      const result = await response.json() as { url?: string; name?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Görsel yüklenemedi.");
      const choice = { url: result.url, name: result.name ?? file.name };
      setImages(current => [choice, ...current]);
      return choice;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Görsel yüklenemedi.");
      return null;
    }
  }

  return <form action={saveArticle} onSubmit={event => {
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 40) { event.preventDefault(); toast.error("Yazı içeriği en az 40 karakter olmalıdır."); }
    if (!image) { event.preventDefault(); toast.error("Bir kapak görseli seçin."); }
  }}>
    {article && <input type="hidden" name="originalSlug" value={article.slug} />}
    <input type="hidden" name="date" value={iso(date)} />
    <input type="hidden" name="image" value={image} />
    <input type="hidden" name="body" value={body} />
    <FieldGroup className="grid gap-7 sm:grid-cols-2">
      <Field className="sm:col-span-2"><FieldLabel htmlFor="article-title">Başlık</FieldLabel><Input id="article-title" className="h-11" name="title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={180} /></Field>
      <Field><FieldLabel htmlFor="article-slug">URL adı</FieldLabel><Input id="article-slug" className="h-11 bg-muted/50" value={article?.slug ?? articleSlug(title)} readOnly tabIndex={-1} /><FieldDescription>Başlıktan otomatik oluşturulur.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="article-category">Kategori</FieldLabel><Input id="article-category" className="h-11" name="category" defaultValue={article?.category} required maxLength={70} /></Field>
      <Field><FieldLabel>Tarih</FieldLabel><Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger render={<Button type="button" variant="outline" className="h-11 w-full justify-start font-normal" />}><CalendarDays className="size-4" />{format(date, "d MMM yyyy", { locale: tr })}</PopoverTrigger><PopoverContent align="start" className="w-auto p-2"><Calendar mode="single" selected={date} onSelect={selected => { if (selected) { setDate(selected); setCalendarOpen(false); } }} locale={tr} /></PopoverContent></Popover></Field>
      <Field><FieldLabel htmlFor="article-duration">Okuma süresi</FieldLabel><InputGroup className="h-11"><InputGroupInput id="article-duration" name="durationAmount" type="number" min={1} max={999} required defaultValue={durationMatch?.[1] ?? "5"} className="h-full" /><InputGroupAddon align="inline-end" className="pr-1"><Select name="durationUnit" defaultValue={durationMatch?.[2]?.toLowerCase() === "saat" ? "hour" : "minute"}><SelectTrigger aria-label="Okuma süresi birimi" className="h-9 border-0 shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minute">dk.</SelectItem><SelectItem value="hour">saat</SelectItem></SelectContent></Select></InputGroupAddon></InputGroup></Field>
      <Field className="sm:col-span-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-3"><FieldLabel>Kapak görseli</FieldLabel><ImageUploadButton upload={uploadImage} label="Kapak görseli yükle" onUploaded={choice => { setImage(choice.url); toast.success("Kapak görseli kütüphaneye eklendi."); }}>Görsel yükle</ImageUploadButton></div><ImageLibrary images={images} selected={image} onSelect={choice => setImage(choice.url)} label="Kapak görseli kütüphanesi" /><FieldDescription>Yüklenen görseller bu kütüphanede görünür. {imageRules}</FieldDescription></Field>
      <Field className="sm:col-span-2"><FieldLabel>Yazı içeriği</FieldLabel><ArticleRichEditor initialHtml={article?.body ?? ""} onChange={setBody} images={images} upload={uploadImage} /></Field>
      <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" name="status" value="draft" variant="outline" size="pill">Taslak olarak kaydet</Button><Button type="submit" name="status" value="published" size="pill">Yayınla</Button></div>
    </FieldGroup>
  </form>;
}
