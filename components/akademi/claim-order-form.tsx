"use client";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { claimOrder } from "@/app/akademi/hesabim/actions";
import { claimSchema } from "@/lib/akademi/claim-schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmailField, FormMessage, FormShell, SubmitButton, submitAction, TextField } from "./form-fields";

export function ClaimOrderForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [granted, setGranted] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(claimSchema), mode: "onTouched", defaultValues: { orderNumber: "", email: defaultEmail } });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(form, () => claimOrder(values), "Sipariş şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin.");
    if (result) setGranted(result.message);
  });
  const again = () => { form.reset(); setGranted(null); };
  if (granted) return <div className="grid gap-5"><div role="status"><Alert><AlertDescription>{granted}</AlertDescription></Alert></div><Link href="/akademi/hesabim" className={buttonVariants()}>Eğitimlerime git</Link><Button type="button" variant="outline" onClick={again}>Başka sipariş ekle</Button></div>;

  return <FormShell form={form} onSubmit={submit} size="lg" fieldsClassName="gap-6">
    <TextField control={form.control} name="orderNumber" label="Shopier sipariş numarası" inputMode="numeric" autoComplete="off" placeholder="Sipariş numaranızı yazın" maxLength={22}
      description="Shopier’in gönderdiği sipariş onay e-postasında yer alır. Başındaki # işaretini de yapıştırabilirsiniz." />
    <EmailField control={form.control} name="email" label="Shopier’de kullandığınız e-posta" description="Satın alırken farklı bir adres kullandıysanız bu alanı değiştirin." />
    <FormMessage />
    <div className="flex flex-wrap gap-3">
      <SubmitButton pendingLabel="Shopier’de kontrol ediliyor…">Siparişimi doğrula ve ekle</SubmitButton>
      {form.formState.errors.root && <Button type="button" variant="outline" onClick={again}>Temizle ve tekrar dene</Button>}
    </div>
  </FormShell>;
}
