"use client";
import { useActionState } from "react";
import { createCourse } from "@/app/yonetim/egitimler/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormStatus, idleForm } from "@/components/akademi/form-status";

export function CourseForm() {
  const [state, action, pending] = useActionState(createCourse, idleForm);
  return <form action={action}>
    <FieldGroup>
      <Field><FieldLabel htmlFor="shopierLink">Shopier ürün linki</FieldLabel><Input id="shopierLink" name="shopierLink" placeholder="https://www.shopier.com/51075042" /><FieldDescription>Ürünü Shopier’de oluşturduysanız linkini yapıştırın. Başlık, açıklama, görsel ve fiyat Shopier’den otomatik alınır ve her gün güncellenir. Boş bırakırsanız ürün aşağıdaki bilgilerle Shopier’de oluşturulur.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="accessDays">Erişim süresi (gün)</FieldLabel><Input id="accessDays" name="accessDays" type="number" min={1} max={3650} defaultValue={365} required /></Field>
      <Field><FieldLabel htmlFor="title">Eğitim adı (yalnızca yeni ürün için)</FieldLabel><Input id="title" name="title" maxLength={120} /></Field>
      <Field><FieldLabel htmlFor="slug">Adres (isteğe bağlı)</FieldLabel><Input id="slug" name="slug" placeholder="dogal-tas-egitimi" pattern="[a-z0-9-]*" /><FieldDescription>Boş bırakırsanız addan oluşturulur: /akademi/…</FieldDescription></Field>
      <Field><FieldLabel htmlFor="description">Açıklama (yalnızca yeni ürün için)</FieldLabel><Textarea id="description" name="description" rows={4} maxLength={5000} /></Field>
      <Field><FieldLabel htmlFor="price">Fiyat (TL, yalnızca yeni ürün için)</FieldLabel><Input id="price" name="price" inputMode="decimal" placeholder="2490" /></Field>
      <Field><FieldLabel htmlFor="cover">Kapak görseli (isteğe bağlı)</FieldLabel><Input id="cover" name="cover" placeholder="/images/akademi/dogal-tas-v1.png" /></Field>
      <Field orientation="horizontal"><Checkbox id="hidden" name="hidden" defaultChecked /><FieldLabel htmlFor="hidden">Otomatik oluşturulan ürünü Shopier mağazasında gizle</FieldLabel></Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Eğitimi ekle"}</Button>
    </FieldGroup>
  </form>;
}
