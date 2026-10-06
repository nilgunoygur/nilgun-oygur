"use client";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { idleForm, type FormState } from "@/components/akademi/form-status";
import { subscribeSchema } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const failed: FormState = { status: "error", message: "Kaydınız alınamadı. Lütfen biraz sonra tekrar deneyin." };

// One field on every public page, so no form library.
export function NewsletterForm() {
  const id = useId();
  const [state, setState] = useState<FormState>(idleForm);
  const [pending, setPending] = useState(false);
  const error = state.status === "error";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = subscribeSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!input.success) return setState({ status: "error", message: input.error.issues[0].message });
    setPending(true);
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const result: FormState = await response.json();
      setState(result.status === "success" || result.status === "error" ? result : failed);
      if (result.status === "success") { track("generate_lead", { method: "newsletter" }); form.reset(); }
    } catch { setState(failed); } finally { setPending(false); }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
      <label htmlFor={id} className="sr-only">E-posta adresiniz</label>
      <div className={cn("flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 transition-shadow focus-within:ring-4 focus-within:ring-lime/50 max-[460px]:flex-col max-[460px]:items-stretch max-[460px]:rounded-[24px] max-[460px]:p-2", error && "ring-4 ring-[#ffb4a8]/70")}>
        <Mail aria-hidden className="size-5 shrink-0 text-muted-foreground max-[460px]:hidden" />
        <input id={id} name="email" type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" readOnly={pending} aria-invalid={error} aria-describedby={`${id}-note`} className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground read-only:opacity-60 max-[460px]:flex-none max-[460px]:px-3" />
        <Button type="submit" size="pill" disabled={pending} className="min-h-11 shrink-0 bg-forest px-6 text-[15px] hover:bg-forest-hover">
          {pending ? <><Spinner />Kaydediliyor…</> : <>Abone ol<ArrowRight data-icon="inline-end" /></>}
        </Button>
      </div>
      <p id={`${id}-note`} role="status" className={cn("mt-3 px-5 text-[13px] text-white/60 max-[460px]:px-2", error && "font-medium text-[#ffc9c0]", state.status === "success" && "font-medium text-lime")}>
        {state.message || "Abone olarak duyuruları e-postayla almayı kabul edersiniz."}
      </p>
    </form>
  );
}
