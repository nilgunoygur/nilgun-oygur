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
import { Button, buttonVariants } from "@/components/ui/button";
import { contactSchema } from "@/lib/contact-schema";
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = contactSchema.safeParse(
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      setDraft("");
      return;
    }
    setErrors({});
    const d = result.data;
    setDraft(
      `mailto:butunselsifaakademi@gmail.com?subject=${encodeURIComponent("İletişim — " + d.name)}&body=${encodeURIComponent(`${d.message}\n\n${d.name}\n${d.email}`)}`,
    );
  }
  return (
    <form onSubmit={submit} noValidate onChange={() => setDraft("")}>
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
                rows={6}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                placeholder="Size nasıl yardımcı olabilirim?"
              />
            ) : (
              <Input
                id={key}
                name={key}
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
          <Button type="submit" size="pill">
            Mesajı Hazırla
          </Button>
          <FieldDescription>
            Mesajınız e-posta uygulamanızda açılır. Göndermeden önce gözden
            geçirebilirsiniz.
          </FieldDescription>
        </Field>
        {draft && (
          <Field>
            <p role="status">
              Mesajınız hazır. Göndermek için e-posta uygulamanızı açın.
            </p>
            <a
              className={buttonVariants({ variant: "secondary", size: "pill" })}
              href={draft}
            >
              E-posta Uygulamasında Aç
            </a>
          </Field>
        )}
      </FieldGroup>
    </form>
  );
}
