"use client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, FieldDescription } from "@/components/ui/field";
import { EmailField, FormShell, SubmitButton, submitAction, TextareaField, TextField } from "@/components/akademi/form-fields";
import { sendContactMessage, sendSupportMessage } from "@/app/iletisim/actions";
import { supportSchema } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";

export function ContactForm({ enabled, support = false }: { enabled: boolean; support?: boolean }) {
  const form = useForm({ resolver: zodResolver(supportSchema), mode: "onTouched", defaultValues: { name: "", email: "", orderNumber: "", message: "" } });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(() => support ? sendSupportMessage(values) : sendContactMessage(values), "Mesajınız alınamadı. Lütfen biraz sonra tekrar deneyin veya bize e-posta gönderin.");
    if (!result) return;
    toast.success(result.message);
    track("generate_lead", { method: support ? "support_form" : "contact_form" });
    form.reset();
  });
  return (
    <FormShell form={form} onSubmit={submit} size="lg" disabled={!enabled}>
      <TextField control={form.control} name="name" label="Adınız Soyadınız" autoComplete="name" placeholder="Adınız Soyadınız" maxLength={100} />
      <EmailField control={form.control} name="email" label="E-posta Adresiniz" />
      {support && <TextField control={form.control} name="orderNumber" label="Shopier sipariş numarası (varsa)" inputMode="numeric" autoComplete="off" maxLength={22} />}
      <TextareaField control={form.control} name="message" label="Mesajınız" rows={6} maxLength={5000} placeholder={support ? "Yaşadığınız sorunu kısaca anlatın." : "Size nasıl yardımcı olabilirim?"} />
      <Field>
        <SubmitButton size="pill" pendingLabel="Gönderiliyor…">Mesajı Gönder</SubmitButton>
        <FieldDescription>Mesajınız doğrudan ekibimize iletilir. Yanıtımız formda yazdığınız e-posta adresine gönderilir.</FieldDescription>
      </Field>
      {!enabled && <Alert variant="destructive"><AlertDescription>İletişim formu şu anda kullanılamıyor. Lütfen bize e-posta ile ulaşın.</AlertDescription></Alert>}
    </FormShell>
  );
}
