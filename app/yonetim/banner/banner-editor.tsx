"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Announcement, BannerConfig } from "@/lib/announcements";
import { saveBanner, type BannerActionState } from "./actions";

const colorFields = [
  { key: "backgroundColor", label: "Arka plan" },
  { key: "textColor", label: "Metin" },
  { key: "accentColor", label: "Ayraç" },
] as const;

export function BannerEditor({ initial, initiallyPublished }: { initial: BannerConfig; initiallyPublished: boolean }) {
  const [banner, setBanner] = useState<BannerConfig>(initial);
  const [result, action, pending] = useActionState<BannerActionState, FormData>(saveBanner, { message: "", error: false, isPublished: initiallyPublished });
  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) => setBanner(current => ({ ...current, [key]: value }));
  const updateItem = (index: number, key: keyof Announcement, value: string) => setBanner(current => ({ ...current, items: current.items.map((item, position) => position === index ? { ...item, [key]: value } : item) }));
  const published = result.isPublished;

  return <form action={action} className="grid gap-6">
    <input type="hidden" name="items" value={JSON.stringify(banner.items)} />
    <input type="hidden" name="loop" value={String(banner.loop)} />
    <input type="hidden" name="pauseOnHover" value={String(banner.pauseOnHover)} />
    <input type="hidden" name="direction" value={banner.direction} />

    <Card className="rounded-[26px] border-forest/10 bg-white py-6 sm:py-8"><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-[25px]">Canlı önizleme</CardTitle><CardDescription className="mt-2">Değişiklikler yayınlanana kadar yalnızca burada görünür.</CardDescription></div><Badge variant={published ? "secondary" : "outline"}>{published ? "Yayında" : "Yayında değil"}</Badge></CardHeader><CardContent><div className="pointer-events-none"><AnnouncementBar config={banner} preview /></div></CardContent></Card>

    <Card className="rounded-[26px] border-forest/10 bg-white py-6 sm:py-8"><CardHeader><CardTitle className="text-[25px]">Duyurular</CardTitle><CardDescription>En fazla 10 mesaj ekleyin. Bağlantı isteğe bağlıdır.</CardDescription></CardHeader><CardContent className="grid gap-4">
      {banner.items.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-forest/10 bg-mist/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field><FieldLabel htmlFor={`banner-text-${index}`}>Mesaj {index + 1}</FieldLabel><Input id={`banner-text-${index}`} className="h-11 bg-white" value={item.text} onChange={event => updateItem(index, "text", event.target.value)} maxLength={180} required /></Field>
        <Field><FieldLabel htmlFor={`banner-link-${index}`}>Bağlantı</FieldLabel><Input id={`banner-link-${index}`} className="h-11 bg-white" value={item.href ?? ""} onChange={event => updateItem(index, "href", event.target.value)} placeholder="/akademi veya https://…" maxLength={500} /></Field>
        <Button type="button" variant="ghost" size="icon-lg" aria-label={`${index + 1}. mesajı kaldır`} disabled={banner.items.length === 1} onClick={() => setBanner(current => ({ ...current, items: current.items.filter((_, position) => position !== index) }))}><Trash2 className="size-4" /></Button>
      </div>)}
      <Button type="button" variant="outline" size="pill" className="justify-self-start" disabled={banner.items.length >= 10} onClick={() => setBanner(current => ({ ...current, items: [...current.items, { text: "", href: "" }] }))}><Plus className="size-4" /> Mesaj ekle</Button>
    </CardContent></Card>

    <Card className="rounded-[26px] border-forest/10 bg-white py-6 sm:py-8"><CardHeader><CardTitle className="text-[25px]">Görünüm ve hareket</CardTitle><CardDescription>Renkleri ve duyuruların nasıl değişeceğini ayarlayın.</CardDescription></CardHeader><CardContent><FieldGroup className="grid gap-5 sm:grid-cols-3">
      {colorFields.map(({ key, label }) => <Field key={key}><FieldLabel htmlFor={`banner-${key}`}>{label} rengi</FieldLabel><div className="flex gap-2"><Input type="color" className="h-11 w-12 shrink-0 cursor-pointer p-1" aria-label={`${label} rengini seç`} value={banner[key]} onChange={event => set(key, event.target.value)} /><Input id={`banner-${key}`} className="h-11" name={key} value={banner[key]} onChange={event => set(key, event.target.value)} pattern="#[0-9a-fA-F]{6}" required /></div></Field>)}
      <Field><FieldLabel htmlFor="banner-animation">Animasyon</FieldLabel><NativeSelect id="banner-animation" className="w-full [&_select]:h-11" name="animation" value={banner.animation} onChange={event => set("animation", event.target.value as BannerConfig["animation"])}><NativeSelectOption value="scroll">Kayan şerit</NativeSelectOption><NativeSelectOption value="fade">Yumuşak geçiş</NativeSelectOption><NativeSelectOption value="static">Sabit ilk mesaj</NativeSelectOption></NativeSelect></Field>
      <Field><FieldLabel htmlFor="banner-speed">Mesaj başına süre (sn)</FieldLabel><Input id="banner-speed" className="h-11" name="speedSeconds" type="number" min={2} max={30} step={1} value={banner.speedSeconds} onChange={event => set("speedSeconds", Number(event.target.value))} required /><FieldDescription>2–30 saniye.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="banner-direction">Kayma yönü</FieldLabel><NativeSelect id="banner-direction" className="w-full [&_select]:h-11" value={banner.direction} onChange={event => set("direction", event.target.value as BannerConfig["direction"])} disabled={banner.animation !== "scroll"}><NativeSelectOption value="left">Sola</NativeSelectOption><NativeSelectOption value="right">Sağa</NativeSelectOption></NativeSelect></Field>
      <Field><FieldLabel htmlFor="banner-separator">Ayraç</FieldLabel><Input id="banner-separator" className="h-11" name="separator" value={banner.separator} onChange={event => set("separator", event.target.value)} maxLength={3} required /></Field>
      <Field className="justify-end"><FieldLabel className="items-center"><Checkbox checked={banner.loop} onCheckedChange={checked => set("loop", checked === true)} /> Sürekli tekrarla</FieldLabel><FieldDescription>Kapalıysa animasyon son mesajda durur.</FieldDescription></Field>
      <Field className="justify-end"><FieldLabel className="items-center"><Checkbox checked={banner.pauseOnHover} onCheckedChange={checked => set("pauseOnHover", checked === true)} /> Üzerine gelince duraklat</FieldLabel></Field>
    </FieldGroup></CardContent></Card>

    <div className="flex flex-wrap items-center gap-3"><Button type="submit" name="intent" value="save" variant="outline" size="pill" disabled={pending}>Taslağı kaydet</Button><Button type="submit" name="intent" value="publish" size="pill" disabled={pending}>{published ? "Değişiklikleri yayınla" : "Yayınla"}</Button>{published && <Button type="submit" name="intent" value="unpublish" variant="destructive" size="pill" disabled={pending} formNoValidate>Yayından kaldır</Button>}{result.message && <p role="status" className={result.error ? "text-sm text-destructive" : "text-sm text-forest"}>{result.message}</p>}</div>
  </form>;
}
