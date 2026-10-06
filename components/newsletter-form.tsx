"use client";
import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { idleForm, type FormState } from "@/components/akademi/form-status";
import { subscribeSchema } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const failed: FormState = { status: "error", message: "Kaydınız alınamadı. Lütfen biraz sonra tekrar deneyin." };

export function NewsletterForm() {
  const id = useId();
  const [sent, setSent] = useState<FormState>(idleForm);
  const form = useForm({ resolver: zodResolver(subscribeSchema), defaultValues: { email: "" } });
  // Subscribed here: the compiler memoizes on the stable `form`, so reading form.formState would go stale.
  const { errors, isSubmitting } = useFormState({ control: form.control });
  const submit = form.handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json() as FormState;
      setSent(result);
      if (result.status !== "success") return;
      track("generate_lead", { method: "newsletter" });
      form.reset();
    } catch { setSent(failed); }
  });
  const error = errors.email?.message ?? (sent.status === "error" ? sent.message : "");
  const message = error || sent.message;

  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="w-full max-w-[440px] [--control-h:2.75rem] max-laptop:max-w-none">
      <label htmlFor={id} className="sr-only">E-posta adresiniz</label>
      <div className="flex gap-2 max-[420px]:flex-col">
        <Input {...form.register("email", { onChange: () => setSent(idleForm) })} id={id} type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" disabled={isSubmitting} aria-invalid={!!error} aria-describedby={`${id}-note`} className="rounded-full bg-white px-4" />
        <Button type="submit" size="pill" disabled={isSubmitting} className="min-h-11 shrink-0 px-6">{isSubmitting ? <><Spinner />Kaydediliyor…</> : "Abone ol"}</Button>
      </div>
      <p id={`${id}-note`} role={message ? "status" : undefined} className={cn("mt-2.5 px-1 text-[12px] text-muted-foreground", error && "text-destructive", !error && message && "font-medium text-forest")}>
        {message || "Abone olarak duyuruları e-postayla almayı kabul edersiniz."}
      </p>
    </form>
  );
}
