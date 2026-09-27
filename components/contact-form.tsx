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
import { contactSchema } from "@/lib/contact-schema";
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const result = contactSchema.safeParse(
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      setStatus("");
      return;
    }
    setErrors({});
    setPending(true);
    setStatus("");
    setFailed(false);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data),
      });
      const body = await response.json();
      setFailed(!response.ok);
      setStatus(body.message);
      if (response.ok) form.reset();
    } catch {
      setFailed(true);
      setStatus("Mesajınız alınamadı. Lütfen tekrar deneyin veya bize e-posta gönderin.");
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
        {status && <p role={failed ? "alert" : "status"}>{status}</p>}
        <a href="mailto:butunselsifaakademi@gmail.com" className="text-sm underline">E-posta ile ulaşın</a>
      </FieldGroup>
    </form>
  );
}
