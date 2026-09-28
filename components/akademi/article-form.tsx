"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { saveArticle } from "@/app/yonetim/yazilar/actions";
import { articleSlug } from "@/lib/akademi/slug";
import { articleSchema } from "@/lib/akademi/owner-forms";
import { ArticleRichEditor } from "@/components/akademi/article-rich-editor";
import { ImageLibrary, ImageUploadButton, imageRules, type ImageChoice } from "@/components/akademi/image-library";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ControlledField, FormMessage, FormShell, submitAction, TextField } from "./form-fields";

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
const units = { minute: "dk.", hour: "saat" };

export function ArticleForm({ article, initialImages }: { article?: ArticleValues; initialImages: ImageChoice[] }) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [images, setImages] = useState(initialImages);
  const durationMatch = article?.duration.match(/^(\d+)\s*(saat|dk)/i);
  const form = useForm({
    resolver: zodResolver(articleSchema), mode: "onTouched",
    defaultValues: {
      title: article?.title ?? "", category: article?.category ?? "", image: article?.image ?? initialImages[0]?.url ?? "",
      date: iso(dateFromLabel(article?.date)), durationAmount: durationMatch?.[1] ?? "5",
      durationUnit: durationMatch?.[2]?.toLowerCase() === "saat" ? "hour" : "minute", body: article?.body ?? "",
    },
  });
  const title = useWatch({ control: form.control, name: "title" });

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

  // Locked after a save until the list page shows, so it cannot save twice. Next keeps this page alive
  // when you leave it, so the lock is released as the page hides.
  const [leaving, setLeaving] = useState(false);
  useEffect(() => () => setLeaving(false), []);
  const save = (status: "draft" | "published") => form.handleSubmit(async (values) => {
    if (!await submitAction(form, () => saveArticle(values, status, article?.slug), "Yazı kaydedilemedi. Yönetim oturumunuzu kontrol edip tekrar deneyin.")) return;
    setLeaving(true);
    router.push("/yonetim/yazilar");
  });

  return <FormShell form={form} onSubmit={save("draft")} busy={leaving} fieldsClassName="grid gap-7 sm:grid-cols-2">
    <div className="sm:col-span-2"><TextField control={form.control} name="title" label="Başlık" maxLength={180} /></div>
    <Field><FieldLabel htmlFor="article-slug">URL adı</FieldLabel><Input id="article-slug" className="bg-muted/50" value={article?.slug ?? articleSlug(title)} readOnly tabIndex={-1} /><FieldDescription>Başlıktan otomatik oluşturulur.</FieldDescription></Field>
    <TextField control={form.control} name="category" label="Kategori" maxLength={70} />
    <ControlledField control={form.control} name="date" label="Tarih">
      {(field, id, invalid) => <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" id={id} ref={field.ref} className="h-(--control-h) w-full justify-start font-normal" aria-invalid={invalid} />}><CalendarDays className="size-4" />{format(parseISO(field.value), "d MMM yyyy", { locale: tr })}</PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2"><Calendar mode="single" selected={parseISO(field.value)} onSelect={selected => { if (selected) { field.onChange(iso(selected)); setCalendarOpen(false); } }} locale={tr} /></PopoverContent>
      </Popover>}
    </ControlledField>
    <ControlledField control={form.control} name="durationAmount" label="Okuma süresi">
      {(field, id, invalid) => <InputGroup>
        <InputGroupInput {...field} value={String(field.value ?? "")} id={id} type="number" inputMode="numeric" min={1} max={999} aria-invalid={invalid} />
        <InputGroupAddon align="inline-end" className="pr-1">
          <Controller control={form.control} name="durationUnit" render={({ field: unit }) => (
            <Select items={units} value={unit.value} onValueChange={unit.onChange}>
              <SelectTrigger aria-label="Okuma süresi birimi" className="border-0 shadow-none data-[size=default]:h-[calc(var(--control-h)-0.75rem)]"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(units).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </InputGroupAddon>
      </InputGroup>}
    </ControlledField>
    <Controller control={form.control} name="image" render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><FieldLabel>Kapak görseli</FieldLabel><ImageUploadButton upload={uploadImage} label="Kapak görseli yükle" onUploaded={choice => { field.onChange(choice.url); toast.success("Kapak görseli kütüphaneye eklendi."); }}>Görsel yükle</ImageUploadButton></div>
        <ImageLibrary images={images} selected={field.value} onSelect={choice => field.onChange(choice.url)} label="Kapak görseli kütüphanesi" />
        <FieldDescription>Yüklenen görseller bu kütüphanede görünür. {imageRules}</FieldDescription>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )} />
    <ControlledField control={form.control} name="body" label="Yazı içeriği" className="sm:col-span-2">
      {field => <ArticleRichEditor initialHtml={article?.body ?? ""} onChange={field.onChange} images={images} upload={uploadImage} />}
    </ControlledField>
    <div className="grid gap-3 sm:col-span-2">
      <FormMessage />
      <div className="flex flex-wrap gap-3"><Button type="submit" variant="outline" size="pill">Taslak olarak kaydet</Button><Button type="button" size="pill" onClick={save("published")}>Yayınla</Button></div>
    </div>
  </FormShell>;
}
