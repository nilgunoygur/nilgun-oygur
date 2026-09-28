"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { authDestination } from "@/lib/auth/navigation";
import { backupCodeSchema, emailLinkSchema, loginSchema, resetSchema, totpSchema } from "@/lib/auth/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formStack } from "@/lib/styles";
import { authAttempt, FormRootError, FormShell, PasswordField, TextField } from "./form-fields";

const RegisterForm = dynamic(() => import("./register-form"));

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";
export const callbackURL = "/akademi/giris?verified=1";
const inboxHint = "Gelen kutunuzu ve spam klasörünüzü kontrol edin.";

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

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <Button type="submit" size="pill" className="w-full min-h-12">
    {pending ? <><LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />Lütfen bekleyin…</> : <>{children}<ArrowRight data-icon="inline-end" /></>}
  </Button>;
}

function LoginForm({ disabled, destination, onSubmitStart }: { disabled: boolean; destination?: string; onSubmitStart: () => void }) {
  const router = useRouter();
  const [mfa, setMfa] = useState<"totp" | "backup" | null>(null);
  const form = useForm({ resolver: zodResolver(loginSchema), mode: "onTouched", defaultValues: { email: "", password: "", remember: true } });
  const enter = () => { track("login", { method: "email" }); router.replace(authDestination(destination)); router.refresh(); };
  if (mfa) return <CodeForm key={mfa} backup={mfa === "backup"} onToggle={() => setMfa(mfa === "backup" ? "totp" : "backup")} onVerified={enter} />;

  const submit = form.handleSubmit(async ({ email, password, remember }) => {
    onSubmitStart();
    const result = await authAttempt(form, () => authClient.signIn.email({ email, password, rememberMe: remember }));
    if (!result) return;
    if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) setMfa("totp"); else enter();
  });
  const pending = form.formState.isSubmitting;
  return <FormShell form={form} onSubmit={submit} size="lg" disabled={disabled}>
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
    <SubmitButton pending={pending}>Giriş yap</SubmitButton>
  </FormShell>;
}

function CodeForm({ backup, onToggle, onVerified }: { backup: boolean; onToggle: () => void; onVerified: () => void }) {
  const form = useForm({ resolver: zodResolver(backup ? backupCodeSchema : totpSchema), mode: "onTouched", defaultValues: { code: "" } });
  const submit = form.handleSubmit(async ({ code }) => {
    if (await authAttempt(form, () => backup ? authClient.twoFactor.verifyBackupCode({ code }) : authClient.twoFactor.verifyTotp({ code, trustDevice: false }))) onVerified();
  });
  const pending = form.formState.isSubmitting;
  return <FormShell form={form} onSubmit={submit} size="lg">
    <FormRootError form={form} />
    <TextField control={form.control} name="code" label={backup ? "Kurtarma kodu" : "Doğrulama kodu"} autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} maxLength={backup ? 64 : 6} autoFocus
      description={backup ? "Kaydettiğiniz kullanılmamış kurtarma kodlarından birini girin." : "Doğrulayıcı uygulamanızdaki 6 haneli kodu girin."} />
    <Button type="button" variant="link" onClick={onToggle}>{backup ? "Doğrulayıcı uygulamasını kullan" : "Kurtarma kodu kullan"}</Button>
    <SubmitButton pending={pending}>Doğrula ve giriş yap</SubmitButton>
  </FormShell>;
}

function EmailLinkForm({ mode, disabled, onSent }: { mode: "forgot" | "verify"; disabled: boolean; onSent: (link: string, text: string) => void }) {
  const form = useForm({ resolver: zodResolver(emailLinkSchema), mode: "onTouched", defaultValues: { email: "" } });
  const forgot = mode === "forgot";
  const submit = form.handleSubmit(async ({ email }) => {
    const call = () => forgot ? authClient.requestPasswordReset({ email, redirectTo: "/akademi/sifre-yenile" }) : authClient.sendVerificationEmail({ email, callbackURL });
    if (!await authAttempt(form, call)) return;
    if (forgot) onSent("şifre yenileme", "Bu adresle bir hesabınız varsa şifre yenileme bağlantısı gönderilecektir.");
    else onSent("doğrulama", "Adresiniz doğrulanmayı bekliyorsa yeni bir bağlantı gönderilecektir.");
  });
  const pending = form.formState.isSubmitting;
  return <FormShell form={form} onSubmit={submit} size="lg" disabled={disabled}>
    <FormRootError form={form} />
    <TextField control={form.control} name="email" label="E-posta adresiniz" type="email" autoComplete="email" maxLength={254} placeholder="ornek@eposta.com" />
    <SubmitButton pending={pending}>{forgot ? "Yenileme bağlantısı gönder" : "Doğrulama bağlantısı gönder"}</SubmitButton>
  </FormShell>;
}

function ResetForm({ disabled, token }: { disabled: boolean; token?: string }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(resetSchema), mode: "onTouched", defaultValues: { password: "", confirmPassword: "" } });
  const submit = form.handleSubmit(async ({ password }) => {
    if (await authAttempt(form, () => authClient.resetPassword({ newPassword: password, token: token! }))) router.replace("/akademi/giris?reset=1");
  });
  const pending = form.formState.isSubmitting;
  return <FormShell form={form} onSubmit={submit} size="lg" disabled={disabled}>
    <FormRootError form={form} />
    <PasswordField control={form.control} name="password" label="Yeni şifreniz" autoComplete="new-password" description="En az 8 karakter." />
    <PasswordField control={form.control} name="confirmPassword" label="Şifrenizi tekrar girin" autoComplete="new-password" />
    <SubmitButton pending={pending}>Şifremi yenile</SubmitButton>
  </FormShell>;
}
