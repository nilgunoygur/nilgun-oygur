"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { contactFormValues, registerSchema } from "@/lib/auth/contact";
import { ContactFields } from "./contact-fields";
import { callbackURL } from "@/lib/auth/navigation";
import { authAttempt, AuthSubmit, EmailField, FormMessage, FormShell, PasswordField, TextField } from "./form-fields";

// Its own chunk: only the register page loads the phone and address code.
export default function RegisterForm({ disabled, onSent }: { disabled: boolean; onSent: () => void }) {
  const form = useForm({
    resolver: zodResolver(registerSchema), mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", contact: contactFormValues() },
  });
  const submit = form.handleSubmit(async ({ name, email, password, contact }) => {
    if (!await authAttempt(form, () => authClient.signUp.email({ name, email, password, callbackURL, ...contact }))) return;
    track("sign_up", { method: "email" });
    onSent();
  });
  return <FormShell form={form} onSubmit={submit} size="lg" disabled={disabled}>
    <TextField control={form.control} name="name" label="Adınız soyadınız" autoComplete="name" maxLength={100} />
    <EmailField control={form.control} name="email" />
    <ContactFields />
    <PasswordField control={form.control} name="password" label="Şifreniz" autoComplete="new-password" description="En az 8 karakter." />
    <PasswordField control={form.control} name="confirmPassword" label="Şifrenizi tekrar girin" autoComplete="new-password" />
    <FormMessage />
    <AuthSubmit>Hesap oluştur</AuthSubmit>
  </FormShell>;
}
