"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormStatus, idleForm } from "@/components/akademi/form-status";
import { sendContactMessage, type ContactState } from "@/app/iletisim/actions";
import { track } from "@/lib/analytics";
const unavailable: ContactState = { status: "error", message: "İletişim formu şu anda kullanılamıyor. Lütfen bize e-posta ile ulaşın." };
export function ContactForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(async (previous, formData) => {
    const next = await sendContactMessage(previous, formData);
    if (next.status === "success") track("generate_lead", { method: "contact_form" });
    return next;
  }, idleForm);
  const errors = state.errors ?? {};
  const disabled = pending || !enabled;
  return (
    <form action={action} noValidate aria-busy={pending}>
      <FieldGroup>
        {(["name", "email", "message"] as const).map((key) => (
          <Field key={key} data-invalid={!!errors[key]}>
            <FieldLabel htmlFor={key}>
              {key === "name"
                ? "Adınız Soyadınız"
                : key === "email"
                  ? "E-posta Adresiniz"
                  : "Mesajınız"}
            </FieldLabel>
            {key === "message" ? (
              <Textarea
                id={key}
                name={key}
                disabled={disabled}
                defaultValue={state.values?.[key]}
                rows={6}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                placeholder="Size nasıl yardımcı olabilirim?"
              />
            ) : (
              <Input
                id={key}
                name={key}
                disabled={disabled}
                defaultValue={state.values?.[key]}
                type={key === "email" ? "email" : "text"}
                autoComplete={key === "email" ? "email" : "name"}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                placeholder={
                  key === "email" ? "ornek@eposta.com" : "Adınız Soyadınız"
                }
              />
            )}{" "}
            {errors[key] && (
              <FieldError id={`${key}-error`}>{errors[key]}</FieldError>
            )}
          </Field>
        ))}
        <Field>
          <Button type="submit" size="pill" disabled={disabled}>
            {pending ? "Gönderiliyor…" : "Mesajı Gönder"}
          </Button>
          <FieldDescription>
            Mesajınız doğrudan ekibimize iletilir. Yanıtımız formda yazdığınız e-posta adresine gönderilir.
          </FieldDescription>
        </Field>
        <FormStatus state={enabled ? state : unavailable} />
      </FieldGroup>
    </form>
  );
}
