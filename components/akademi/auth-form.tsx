"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { authDestination, authErrorMessage } from "@/lib/auth/navigation";
import { backupCodeSchema, emailLinkSchema, loginSchema, registerSchema, resetSchema, totpSchema } from "@/lib/auth/forms";
import { contactFormValues } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formStack } from "@/lib/styles";
import { ContactFields } from "./contact-fields";
import { FormRootError, PasswordField, TextField } from "./form-fields";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";
const inboxHint = "Gelen kutunuzu ve spam klasörünüzü kontrol edin.";
const offline = "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.";
const callbackURL = "/akademi/giris?verified=1";
type Failure = { code?: string; status?: number } | null;

export function AuthForm({ mode, configured, localEmail = false, token, destination, initialMessage }: {
  mode: AuthMode; configured: boolean; localEmail?: boolean; token?: string; destination?: string; initialMessage?: string;
}) {
  const [notice, setNotice] = useState(initialMessage ?? "");
  const [done, setDone] = useState(false);
  const invalidReset = mode === "reset" && !token;
  const sent = (link: string, text: string) => {
    setNotice(localEmail ? `Yerel test ${link} bağlantısı, pnpm run dev komutunun çalıştığı terminale yazdırıldı.` : `${text} ${inboxHint}`);
    setDone(true);
  };
  const disabled = !configured || invalidReset;
  return (
    <div className={formStack}>
      {!configured && <Alert><AlertDescription>Akademi hesapları henüz kullanıma açılmadı. Yakında buradan hesabınızı oluşturabilirsiniz.</AlertDescription></Alert>}
      {invalidReset && <Alert variant="destructive"><AlertDescription>Şifre yenileme bağlantısı geçersiz veya eksik. <Link href="/akademi/sifremi-unuttum" className="underline underline-offset-4">Yeni bağlantı isteyin.</Link></AlertDescription></Alert>}
      {notice && <div role="status"><Alert><AlertDescription>{notice}</AlertDescription></Alert></div>}
      {!done && (mode === "login" ? <LoginForm disabled={disabled} destination={destination} onSubmitStart={() => setNotice("")} />
        : mode === "register" ? <RegisterForm disabled={disabled} onSent={() => sent("doğrulama", "Adresinizle hesap oluşturulabiliyorsa doğrulama bağlantısı gönderilecektir.")} />
        : mode === "reset" ? <ResetForm disabled={disabled} token={token} />
        : <EmailLinkForm mode={mode} disabled={disabled} onSent={sent} />)}
      <nav className="flex flex-col gap-4 text-center text-[14px] [&_a]:underline [&_a]:underline-offset-4" aria-label="Hesap işlemleri">
        {mode === "login" ? <><span>Henüz hesabınız yok mu? <Link href="/akademi/kayit">Hesap oluşturun</Link></span><Link href="/akademi/dogrulama">Doğrulama e-postasını yeniden gönder</Link></> : <Link href="/akademi/giris">Giriş sayfasına dön</Link>}
      </nav>
    </div>
  );
}

function SubmitButton({ pending, disabled, children }: { pending: boolean; disabled: boolean; children: React.ReactNode }) {
  return <Button type="submit" size="pill" className="w-full min-h-12" disabled={pending || disabled}>
    {pending ? <><LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />Lütfen bekleyin…</> : <>{children}<ArrowRight data-icon="inline-end" /></>}
  </Button>;
}

/** Runs a Better Auth call; failures become the form's root error. Returns whether it succeeded. */
async function attempt(setRootError: (message: string) => void, call: () => Promise<{ error: Failure }>) {
  try {
    const { error } = await call();
    if (error) { setRootError(authErrorMessage(error)); return false; }
    return true;
  } catch { setRootError(offline); return false; }
}

function LoginForm({ disabled, destination, onSubmitStart }: { disabled: boolean; destination?: string; onSubmitStart: () => void }) {
  const router = useRouter();
  const [mfa, setMfa] = useState(false);
  const form = useForm({ resolver: zodResolver(loginSchema), mode: "onTouched", defaultValues: { email: "", password: "", remember: true } });
  const enter = () => { track("login", { method: "email" }); router.replace(authDestination(destination)); router.refresh(); };
  if (mfa) return <MfaForm onVerified={enter} />;

  const submit = form.handleSubmit(async ({ email, password, remember }) => {
    onSubmitStart();
    let redirect = false;
    const ok = await attempt(message => form.setError("root", { message }), async () => {
      const result = await authClient.signIn.email({ email, password, rememberMe: remember });
      redirect = !!(result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect);
      return result;
    });
    if (!ok) return;
    if (redirect) setMfa(true); else enter();
  });
  const pending = form.formState.isSubmitting;
  return <form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="contents"><FieldGroup>
      <FormRootError form={form} />
      <TextField control={form.control} name="email" label="E-posta adresiniz" type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" />
      <PasswordField control={form.control} name="password" label="Şifreniz" autoComplete="current-password" />
      <div className="flex items-center justify-between gap-4 text-[13px] max-[681px]:flex-wrap">
        <Controller control={form.control} name="remember" render={({ field }) => (
          <Field orientation="horizontal" className="w-auto">
            <Checkbox id="remember" checked={field.value} onCheckedChange={field.onChange} />
            <FieldLabel htmlFor="remember">Beni hatırla</FieldLabel>
          </Field>
        )} />
        <Link href="/akademi/sifremi-unuttum" className="whitespace-nowrap underline underline-offset-4">Şifremi unuttum</Link>
      </div>
      <SubmitButton pending={pending} disabled={disabled}>Giriş yap</SubmitButton>
    </FieldGroup></fieldset>
  </form>;
}

function MfaForm({ onVerified }: { onVerified: () => void }) {
  const [backup, setBackup] = useState(false);
  // Remounted per method so each keeps its own schema and empty value.
  return <CodeForm key={backup ? "backup" : "totp"} backup={backup} onToggle={() => setBackup(value => !value)} onVerified={onVerified} />;
}

function CodeForm({ backup, onToggle, onVerified }: { backup: boolean; onToggle: () => void; onVerified: () => void }) {
  const form = useForm({ resolver: zodResolver(backup ? backupCodeSchema : totpSchema), mode: "onTouched", defaultValues: { code: "" } });
  const submit = form.handleSubmit(async ({ code }) => {
    const ok = await attempt(message => form.setError("root", { message }), () => backup ? authClient.twoFactor.verifyBackupCode({ code }) : authClient.twoFactor.verifyTotp({ code, trustDevice: false }));
    if (ok) onVerified();
  });
  const pending = form.formState.isSubmitting;
  return <form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending} className="contents"><FieldGroup>
      <FormRootError form={form} />
      <TextField control={form.control} name="code" label={backup ? "Kurtarma kodu" : "Doğrulama kodu"} autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} maxLength={backup ? 64 : 6} autoFocus
        description={backup ? "Kaydettiğiniz kullanılmamış kurtarma kodlarından birini girin." : "Doğrulayıcı uygulamanızdaki 6 haneli kodu girin."} />
      <Button type="button" variant="link" onClick={onToggle}>{backup ? "Doğrulayıcı uygulamasını kullan" : "Kurtarma kodu kullan"}</Button>
      <SubmitButton pending={pending} disabled={false}>Doğrula ve giriş yap</SubmitButton>
    </FieldGroup></fieldset>
  </form>;
}

function RegisterForm({ disabled, onSent }: { disabled: boolean; onSent: () => void }) {
  const form = useForm({
    resolver: zodResolver(registerSchema), mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", contact: contactFormValues() },
  });
  const submit = form.handleSubmit(async ({ name, email, password, contact }) => {
    const ok = await attempt(message => form.setError("root", { message }), () => authClient.signUp.email({ name, email, password, callbackURL, ...contact }));
    if (!ok) return;
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
      <SubmitButton pending={pending} disabled={disabled}>Hesap oluştur</SubmitButton>
    </FieldGroup></fieldset>
  </form></FormProvider>;
}

function EmailLinkForm({ mode, disabled, onSent }: { mode: "forgot" | "verify"; disabled: boolean; onSent: (link: string, text: string) => void }) {
  const form = useForm({ resolver: zodResolver(emailLinkSchema), mode: "onTouched", defaultValues: { email: "" } });
  const submit = form.handleSubmit(async ({ email }) => {
    const setRootError = (message: string) => form.setError("root", { message });
    if (mode === "forgot") {
      if (await attempt(setRootError, () => authClient.requestPasswordReset({ email, redirectTo: "/akademi/sifre-yenile" }))) onSent("şifre yenileme", "Bu adresle bir hesabınız varsa şifre yenileme bağlantısı gönderilecektir.");
    } else if (await attempt(setRootError, () => authClient.sendVerificationEmail({ email, callbackURL }))) {
      onSent("doğrulama", "Adresiniz doğrulanmayı bekliyorsa yeni bir bağlantı gönderilecektir.");
    }
  });
  const pending = form.formState.isSubmitting;
  return <form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="contents"><FieldGroup>
      <FormRootError form={form} />
      <TextField control={form.control} name="email" label="E-posta adresiniz" type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" />
      <SubmitButton pending={pending} disabled={disabled}>{mode === "forgot" ? "Yenileme bağlantısı gönder" : "Doğrulama bağlantısı gönder"}</SubmitButton>
    </FieldGroup></fieldset>
  </form>;
}

function ResetForm({ disabled, token }: { disabled: boolean; token?: string }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(resetSchema), mode: "onTouched", defaultValues: { password: "", confirmPassword: "" } });
  const submit = form.handleSubmit(async ({ password }) => {
    if (await attempt(message => form.setError("root", { message }), () => authClient.resetPassword({ newPassword: password, token: token! }))) router.replace("/akademi/giris?reset=1");
  });
  const pending = form.formState.isSubmitting;
  return <form onSubmit={submit} noValidate aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="contents"><FieldGroup>
      <FormRootError form={form} />
      <PasswordField control={form.control} name="password" label="Yeni şifreniz" autoComplete="new-password" description="En az 8 karakter." />
      <PasswordField control={form.control} name="confirmPassword" label="Şifrenizi tekrar girin" autoComplete="new-password" />
      <SubmitButton pending={pending} disabled={disabled}>Şifremi yenile</SubmitButton>
    </FieldGroup></fieldset>
  </form>;
}
