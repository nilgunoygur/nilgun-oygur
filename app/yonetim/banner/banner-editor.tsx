"use client";

import { useId, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { AnnouncementBar } from "@/components/announcement-bar";
import { FormShell, SelectField, TextField } from "@/components/akademi/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BannerConfig } from "@/lib/announcements";
import { bannerSchema, type BannerFormValues } from "@/lib/akademi/owner-forms";
import { saveBanner, type BannerActionState } from "./actions";

type Intent = "save" | "publish" | "unpublish";
type BannerControl = Control<BannerFormValues, unknown, BannerConfig>;
const colorFields = [
  { key: "backgroundColor", label: "Arka plan" },
  { key: "textColor", label: "Metin" },
  { key: "accentColor", label: "Ayraç" },
] as const;
const animations = { scroll: "Kayan şerit", fade: "Yumuşak geçiş", static: "Sabit ilk mesaj" };
const directions = { left: "Sola", right: "Sağa" };
const card = "rounded-[26px] border-forest/10 bg-white py-6 sm:py-8";

const formValues = (banner: BannerConfig): BannerFormValues => ({
  ...banner, speedSeconds: String(banner.speedSeconds), items: banner.items.map(item => ({ text: item.text, href: item.href ?? "" })),
});

export function BannerEditor({ initial, initiallyPublished }: { initial: BannerConfig; initiallyPublished: boolean }) {
  const [result, setResult] = useState<BannerActionState>({ message: "", error: false, isPublished: initiallyPublished });
  const [pending, startTransition] = useTransition();
  const form = useForm({ resolver: zodResolver(bannerSchema), mode: "onTouched", defaultValues: formValues(initial) });
  const items = useFieldArray({ control: form.control, name: "items" });
  const animation = useWatch({ control: form.control, name: "animation" });
  const published = result.isPublished;

  const run = (intent: Intent, values: BannerFormValues | null) => startTransition(async () => {
    try { setResult(await saveBanner(intent, values, published)); }
    catch { setResult({ message: "Banner kaydedilemedi. Lütfen tekrar deneyin.", error: true, isPublished: published }); }
  });
  // Saving and publishing validate the form; unpublishing ignores unsaved edits.
  const submit = (intent: Exclude<Intent, "unpublish">) => form.handleSubmit(values => run(intent, values));

  return <FormShell form={form} onSubmit={submit("save")} busy={pending} fieldsClassName="gap-6">
    <Card className={card}><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-[25px]">Canlı önizleme</CardTitle><CardDescription className="mt-2">Değişiklikler yayınlanana kadar yalnızca burada görünür.</CardDescription></div><Badge variant={published ? "secondary" : "outline"}>{published ? "Yayında" : "Yayında değil"}</Badge></CardHeader><CardContent><div className="pointer-events-none"><Preview control={form.control} fallback={initial} /></div></CardContent></Card>

    <Card className={card}><CardHeader><CardTitle className="text-[25px]">Duyurular</CardTitle><CardDescription>En fazla 10 mesaj ekleyin. Bağlantı isteğe bağlıdır.</CardDescription></CardHeader><CardContent className="grid gap-4">
      {items.fields.map((item, index) => <div key={item.id} className="grid gap-3 rounded-2xl border border-forest/10 bg-mist/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <TextField control={form.control} name={`items.${index}.text`} label={`Mesaj ${index + 1}`} className="bg-white" maxLength={180} />
        <TextField control={form.control} name={`items.${index}.href`} label="Bağlantı" className="bg-white" placeholder="/akademi veya https://…" maxLength={500} />
        <Button type="button" variant="ghost" size="icon-lg" className="sm:mt-7" aria-label={`${index + 1}. mesajı kaldır`} disabled={items.fields.length === 1} onClick={() => items.remove(index)}><Trash2 className="size-4" /></Button>
      </div>)}
      {form.formState.errors.items?.root && <FieldError errors={[form.formState.errors.items.root]} />}
      <Button type="button" variant="outline" size="pill" className="justify-self-start" disabled={items.fields.length >= 10} onClick={() => items.append({ text: "", href: "" })}><Plus className="size-4" /> Mesaj ekle</Button>
    </CardContent></Card>

    <Card className={card}><CardHeader><CardTitle className="text-[25px]">Görünüm ve hareket</CardTitle><CardDescription>Renkleri ve duyuruların nasıl değişeceğini ayarlayın.</CardDescription></CardHeader><CardContent><FieldGroup className="grid gap-5 sm:grid-cols-3">
      {colorFields.map(({ key, label }) => <ColorField key={key} control={form.control} name={key} label={label} />)}
      <SelectField control={form.control} name="animation" label="Animasyon" options={animations} />
      <TextField control={form.control} name="speedSeconds" label="Mesaj başına süre (sn)" type="number" inputMode="numeric" min={2} max={30} step={1} description="2–30 saniye." />
      <SelectField control={form.control} name="direction" label="Kayma yönü" options={directions} disabled={animation !== "scroll"} />
      <TextField control={form.control} name="separator" label="Ayraç" maxLength={3} />
      {([["loop", "Sürekli tekrarla", "Kapalıysa animasyon son mesajda durur."], ["pauseOnHover", "Üzerine gelince duraklat", null]] as const).map(([name, label, description]) =>
        <Controller key={name} control={form.control} name={name} render={({ field }) => (
          <Field className="justify-end">
            <FieldLabel className="items-center"><Checkbox ref={field.ref} checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} /> {label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </Field>
        )} />)}
    </FieldGroup></CardContent></Card>

    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="outline" size="pill">Taslağı kaydet</Button>
      <Button type="button" size="pill" onClick={submit("publish")}>{published ? "Değişiklikleri yayınla" : "Yayınla"}</Button>
      {published && <Button type="button" variant="destructive" size="pill" onClick={() => run("unpublish", null)}>Yayından kaldır</Button>}
      {result.message && <p role="status" className={result.error ? "text-sm text-destructive" : "text-sm text-forest"}>{result.message}</p>}
    </div>
  </FormShell>;
}

/** The live bar, from the current (possibly invalid) values. */
function Preview({ control, fallback }: { control: BannerControl; fallback: BannerConfig }) {
  const values = useWatch({ control });
  const config: BannerConfig = {
    ...fallback, ...values,
    speedSeconds: Number(values.speedSeconds) || fallback.speedSeconds,
    items: (values.items ?? []).map(item => ({ text: item?.text ?? "", href: item?.href || undefined })),
  } as BannerConfig;
  return <AnnouncementBar config={config} preview />;
}

function ColorField({ control, name, label }: { control: BannerControl; name: (typeof colorFields)[number]["key"]; label: string }) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label} rengi</FieldLabel>
      <div className="flex gap-2">
        <Input type="color" className="w-12 shrink-0 cursor-pointer p-1" aria-label={`${label} rengini seç`} value={field.value} onChange={field.onChange} />
        <Input {...field} id={id} aria-invalid={fieldState.invalid} />
      </div>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}
