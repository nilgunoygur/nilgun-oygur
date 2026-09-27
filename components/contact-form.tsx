"use client";
import { useState, type FormEvent } from "react";
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
import { FormStatus, idleForm, type FormState } from "@/components/akademi/form-status";
import { contactSchema } from "@/lib/contact-schema";
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<FormState>(idleForm);
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = contactSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    setState(idleForm);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data),
      });
      const { message } = await response.json();
      setState({ status: response.ok ? "success" : "error", message });
      if (response.ok) form.reset();
    } catch {
      setState({ status: "error", message: "Mesajınız alınamadı. Lütfen tekrar deneyin veya bize e-posta gönderin." });
    } finally { setPending(false); }
  }
  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
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
                disabled={pending}
                rows={6}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                placeholder="Size nasıl yardımcı olabilirim?"
              />
            ) : (
              <Input
                id={key}
                name={key}
                disabled={pending}
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
          <Button type="submit" size="pill" disabled={pending}>
            {pending ? "Gönderiliyor…" : "Mesajı Gönder"}
          </Button>
          <FieldDescription>
            Mesajınız doğrudan ekibimize iletilir. Yanıtımız formda yazdığınız e-posta adresine gönderilir.
          </FieldDescription>
        </Field>
        <FormStatus state={state} />
      </FieldGroup>
    </form>
  );
}
