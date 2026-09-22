"use client";
import { useActionState } from "react";
import { claimOrder } from "@/app/akademi/hesabim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormStatus, idleForm } from "@/components/akademi/form-status";

export function ClaimOrderForm() {
  const [state, action, pending] = useActionState(claimOrder, idleForm);
  return <form action={action}>
    <FieldGroup>
      <Field><FieldLabel htmlFor="orderNumber">Shopier sipariş numarası</FieldLabel><Input id="orderNumber" name="orderNumber" inputMode="numeric" autoComplete="off" required /><FieldDescription>Shopier’in gönderdiği sipariş onay e-postasında yer alır.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="claimEmail">Shopier’de kullandığınız e-posta</FieldLabel><Input id="claimEmail" name="email" type="email" autoComplete="email" required /></Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Kontrol ediliyor…" : "Siparişimi ekle"}</Button>
    </FieldGroup>
  </form>;
}
