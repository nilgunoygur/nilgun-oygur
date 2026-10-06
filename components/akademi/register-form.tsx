"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { contactFormValues, registerSchema } from "@/lib/auth/contact";
import { ContactFields } from "./contact-fields";
import { verificationCallback } from "@/lib/auth/navigation";
import { authAttempt, AuthSubmit, CheckboxField, EmailField, FormMessage, FormShell, PasswordField, TextField } from "./form-fields";

// Its own chunk: only the register page loads the phone and address code.
export default function RegisterForm({ disabled, destination, onSent }: { disabled: boolean; destination?: string; onSent: () => void }) {
  const form = useForm({
    resolver: zodResolver(registerSchema), mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", contact: contactFormValues(), newsletter: false },
  });
  const submit = form.handleSubmit(async ({ name, email, password, contact, newsletter }) => {
    if (!await authAttempt(form, () => authClient.signUp.email({ name, email, password, callbackURL: verificationCallback(destination), ...contact }))) return;
    // Best effort.
    if (newsletter) void fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), keepalive: true }).catch(() => {});
    track("sign_up", { method: "email" });
    onSent();
  });
  return <FormShell form={form} onSubmit={submit} size="lg" disabled={disabled}>
    <TextField control={form.control} name="name" label="Adınız soyadınız" autoComplete="name" maxLength={100} />
    <EmailField control={form.control} name="email" />
    <ContactFields />
    <PasswordField control={form.control} name="password" label="Şifreniz" autoComplete="new-password" description="En az 8 karakter." />
    <PasswordField control={form.control} name="confirmPassword" label="Şifrenizi tekrar girin" autoComplete="new-password" />
    <CheckboxField control={form.control} name="newsletter" label="Bültene abone ol" description="Yeni yazılar ve eğitim duyuruları e-postayla gelsin. İstediğiniz zaman ayrılabilirsiniz." />
    <FormMessage />
    <AuthSubmit>Hesap oluştur</AuthSubmit>
  </FormShell>;
}
