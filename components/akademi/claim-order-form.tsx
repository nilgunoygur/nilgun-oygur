"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { claimOrder } from "@/app/akademi/hesabim/actions";
import { claimSchema } from "@/lib/akademi/claim-schema";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormStatus, idleForm, type FormState } from "@/components/akademi/form-status";
import { FormRootError, TextField } from "./form-fields";

export function ClaimOrderForm() {
  const [granted, setGranted] = useState<FormState>(idleForm);
  const form = useForm({ resolver: zodResolver(claimSchema), mode: "onTouched", defaultValues: { orderNumber: "", email: "" } });
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await claimOrder(values);
      if (result.status === "error") { form.setError("root", { message: result.message }); toast.error(result.message); return; }
      setGranted(result);
    } catch { form.setError("root", { message: "Sipariş şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin." }); }
  });
  const again = () => { form.reset(); setGranted(idleForm); };
  if (granted.status === "success") return <div className="grid gap-5"><FormStatus state={granted} /><Button type="button" variant="outline" onClick={again}>Başka sipariş ekle</Button></div>;

  const pending = form.formState.isSubmitting;
  return <form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending} className="contents"><FieldGroup className="gap-6">
      <TextField control={form.control} name="orderNumber" label="Shopier sipariş numarası" inputMode="numeric" autoComplete="off" placeholder="Sipariş numaranızı yazın" maxLength={20}
        description="Shopier’in gönderdiği sipariş onay e-postasında yer alır." />
      <TextField control={form.control} name="email" label="Shopier’de kullandığınız e-posta" type="email" autoComplete="email" placeholder="ornek@eposta.com" maxLength={254} />
      <FormRootError form={form} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{pending ? "Shopier’de kontrol ediliyor…" : "Siparişimi doğrula ve ekle"}</Button>
        {form.formState.errors.root && <Button type="button" variant="outline" onClick={again}>Temizle ve tekrar dene</Button>}
      </div>
    </FieldGroup></fieldset>
  </form>;
}
