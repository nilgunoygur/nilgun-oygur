"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, FieldDescription } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormStatus, idleForm, type FormState } from "@/components/akademi/form-status";
import { FormRootError, FormShell, submitAction, TextareaField, TextField } from "@/components/akademi/form-fields";
import { sendContactMessage } from "@/app/iletisim/actions";
import { contactSchema } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";

const unavailable: FormState = { status: "error", message: "İletişim formu şu anda kullanılamıyor. Lütfen bize e-posta ile ulaşın." };

export function ContactForm({ enabled }: { enabled: boolean }) {
  const [sent, setSent] = useState<FormState>(idleForm);
  const form = useForm({ resolver: zodResolver(contactSchema), mode: "onTouched", defaultValues: { name: "", email: "", message: "" } });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(form, () => sendContactMessage(values), "Mesajınız alınamadı. Lütfen biraz sonra tekrar deneyin veya bize e-posta gönderin.");
    setSent(result ?? idleForm);
    if (!result) return;
    track("generate_lead", { method: "contact_form" });
    form.reset();
  });
  const pending = form.formState.isSubmitting;
  return (
    <FormShell form={form} onSubmit={submit} size="lg" disabled={!enabled}>
      <TextField control={form.control} name="name" label="Adınız Soyadınız" autoComplete="name" placeholder="Adınız Soyadınız" maxLength={100} />
      <TextField control={form.control} name="email" label="E-posta Adresiniz" type="email" autoComplete="email" placeholder="ornek@eposta.com" maxLength={254} />
      <TextareaField control={form.control} name="message" label="Mesajınız" rows={6} maxLength={5000} placeholder="Size nasıl yardımcı olabilirim?" />
      <Field>
        <Button type="submit" size="pill">{pending ? "Gönderiliyor…" : "Mesajı Gönder"}</Button>
        <FieldDescription>Mesajınız doğrudan ekibimize iletilir. Yanıtımız formda yazdığınız e-posta adresine gönderilir.</FieldDescription>
      </Field>
      <FormRootError form={form} />
      <FormStatus state={enabled ? sent : unavailable} />
    </FormShell>
  );
}
