"use client";
import { useActionState } from "react";
import { linkCourse } from "@/app/yonetim/egitimler/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormStatus, idleForm } from "@/components/akademi/form-status";

export function LinkCourseForm() {
  const [state, action, pending] = useActionState(linkCourse, idleForm);
  return <form action={action}>
    <FieldGroup>
      <Field><FieldLabel htmlFor="shopierLink">Shopier ürün linki</FieldLabel><Input id="shopierLink" name="shopierLink" required placeholder="https://www.shopier.com/51075042" /><FieldDescription>Mağazada gizli ürünler için. Görünür ve stokta olan dijital ürünler otomatik eklenir.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="accessDays">Erişim süresi (gün)</FieldLabel><Input id="accessDays" name="accessDays" type="number" min={1} max={3650} defaultValue={365} required /></Field>
      <Field><FieldLabel htmlFor="slug">Adres (isteğe bağlı)</FieldLabel><Input id="slug" name="slug" placeholder="dogal-tas-egitimi" pattern="[a-z0-9-]*" /></Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Ekleniyor…" : "Eğitimi bağla"}</Button>
    </FieldGroup>
  </form>;
}
