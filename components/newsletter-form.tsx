"use client";
import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";
import { ArrowRight, CircleCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { idleForm, type FormState } from "@/components/akademi/form-status";
import { subscribeSchema } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const failed: FormState = { status: "error", message: "Kaydınız alınamadı. Lütfen biraz sonra tekrar deneyin." };

/** Styled for the dark footer band. */
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
      if (result.status === "success") track("generate_lead", { method: "newsletter" });
    } catch { setSent(failed); }
  });
  const error = errors.email?.message ?? (sent.status === "error" ? sent.message : "");

  if (sent.status === "success") return (
    <p role="status" className="flex items-center gap-3 rounded-[20px] bg-white/10 px-6 py-5 text-[16px] text-white">
      <CircleCheck className="size-6 shrink-0 text-lime" />{sent.message}
    </p>
  );
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
      <label htmlFor={id} className="sr-only">E-posta adresiniz</label>
      <div className={cn("flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 transition-shadow focus-within:ring-4 focus-within:ring-lime/50 max-[460px]:flex-col max-[460px]:items-stretch max-[460px]:rounded-[24px] max-[460px]:p-2", error && "ring-4 ring-[#ffb4a8]/70")}>
        <Mail aria-hidden className="size-5 shrink-0 text-muted-foreground max-[460px]:hidden" />
        <input {...form.register("email", { onChange: () => setSent(idleForm) })} id={id} type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" disabled={isSubmitting} aria-invalid={!!error} aria-describedby={`${id}-note`} className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60 max-[460px]:flex-none max-[460px]:px-3" />
        <Button type="submit" size="pill" disabled={isSubmitting} className="min-h-11 shrink-0 bg-forest px-6 text-[15px] hover:bg-forest-hover">
          {isSubmitting ? <><Spinner />Kaydediliyor…</> : <>Abone ol<ArrowRight data-icon="inline-end" /></>}
        </Button>
      </div>
      <p id={`${id}-note`} role={error ? "alert" : undefined} className={cn("mt-3 px-5 text-[13px] text-white/60 max-[460px]:px-2", error && "font-medium text-[#ffc9c0]")}>
        {error || "Abone olarak duyuruları e-postayla almayı kabul edersiniz."}
      </p>
    </form>
  );
}
