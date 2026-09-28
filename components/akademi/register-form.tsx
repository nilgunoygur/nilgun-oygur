"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { contactFormValues, registerSchema } from "@/lib/auth/contact";
import { FieldGroup } from "@/components/ui/field";
import { ContactFields } from "./contact-fields";
import { authAttempt, FormRootError, PasswordField, TextField } from "./form-fields";
import { callbackURL, SubmitButton } from "./auth-form";

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
  const pending = form.formState.isSubmitting;
  return <FormProvider {...form}><form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="contents"><FieldGroup>
      <TextField control={form.control} name="name" label="Adınız soyadınız" autoComplete="name" maxLength={100} />
      <TextField control={form.control} name="email" label="E-posta adresiniz" type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" />
      <ContactFields />
      <PasswordField control={form.control} name="password" label="Şifreniz" autoComplete="new-password" description="En az 8 karakter." />
      <PasswordField control={form.control} name="confirmPassword" label="Şifrenizi tekrar girin" autoComplete="new-password" />
      <FormRootError form={form} />
      <SubmitButton pending={pending}>Hesap oluştur</SubmitButton>
    </FieldGroup></fieldset>
  </form></FormProvider>;
}
