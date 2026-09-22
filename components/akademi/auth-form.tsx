"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { authDestination, authErrorMessage } from "@/lib/auth/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formStack } from "@/lib/styles";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";
const labels = { login: "Giriş yap", register: "Hesap oluştur", forgot: "Yenileme bağlantısı gönder", reset: "Şifremi yenile", verify: "Doğrulama bağlantısı gönder" };

export function AuthForm({ mode, configured, token, destination, initialMessage }: {
  mode: AuthMode; configured: boolean; token?: string; destination?: string; initialMessage?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [mfa, setMfa] = useState(false);
  const [backup, setBackup] = useState(false);
  const [remember, setRemember] = useState(true);
  const [done, setDone] = useState(false);
  const invalidReset = mode === "reset" && !token;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured || invalidReset) return;
    const data = new FormData(event.currentTarget);
    setError(""); setMessage("");
    if ((mode === "reset" || mode === "register") && data.get("password") !== data.get("confirmPassword")) {
      setError("Şifreler eşleşmiyor."); return;
    }
    setPending(true);
    try {
      const email = String(data.get("email") ?? "").trim();
      const password = String(data.get("password") ?? "");
      const callbackURL = "/akademi/giris?verified=1";
      if (mfa) {
        const code = String(data.get("code") ?? "").trim();
        const result = backup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        router.replace(authDestination(destination)); router.refresh();
      } else if (mode === "login") {
        const result = await authClient.signIn.email({ email, password, rememberMe: remember });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) { setMfa(true); return; }
        router.replace(authDestination(destination)); router.refresh();
      } else if (mode === "register") {
        const result = await authClient.signUp.email({ name: String(data.get("name")).trim(), email, password, callbackURL });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        setMessage("Adresinizle hesap oluşturulabiliyorsa doğrulama bağlantısı gönderilecektir. Gelen kutunuzu ve spam klasörünüzü kontrol edin."); setDone(true);
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: "/akademi/sifre-yenile" });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        setMessage("Bu adresle bir hesabınız varsa şifre yenileme bağlantısı gönderilecektir. Gelen kutunuzu ve spam klasörünüzü kontrol edin."); setDone(true);
      } else if (mode === "verify") {
        const result = await authClient.sendVerificationEmail({ email, callbackURL });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        setMessage("Adresiniz doğrulanmayı bekliyorsa yeni bir bağlantı gönderilecektir. Gelen kutunuzu ve spam klasörünüzü kontrol edin."); setDone(true);
      } else {
        const result = await authClient.resetPassword({ newPassword: password, token: token! });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        router.replace("/akademi/giris?reset=1");
      }
    } catch { setError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin."); }
    finally { setPending(false); }
  }

  return (
    <div className={formStack}>
      {!configured && <Alert><AlertDescription>Akademi hesapları henüz kullanıma açılmadı. Yakında buradan hesabınızı oluşturabilirsiniz.</AlertDescription></Alert>}
      {invalidReset && <Alert variant="destructive"><AlertDescription>Şifre yenileme bağlantısı geçersiz veya eksik. <Link href="/akademi/sifremi-unuttum" className="underline underline-offset-4">Yeni bağlantı isteyin.</Link></AlertDescription></Alert>}
      {message && <div role="status"><Alert><AlertDescription>{message}</AlertDescription></Alert></div>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {!done && <form onSubmit={submit} aria-busy={pending}>
        <FieldGroup>
          {mfa ? <Field>
            <FieldLabel htmlFor="code">{backup ? "Kurtarma kodu" : "Doğrulama kodu"}</FieldLabel>
            <Input key={backup ? "backup" : "totp"} id="code" name="code" autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} pattern={backup ? undefined : "[0-9]{6}"} minLength={backup ? undefined : 6} maxLength={backup ? 64 : 6} required autoFocus disabled={pending} aria-invalid={!!error} />
            <FieldDescription>{backup ? "Kaydettiğiniz kullanılmamış kurtarma kodlarından birini girin." : "Doğrulayıcı uygulamanızdaki 6 haneli kodu girin."}</FieldDescription>
            <Button type="button" variant="link" onClick={() => { setBackup(!backup); setError(""); }} disabled={pending}>{backup ? "Doğrulayıcı uygulamasını kullan" : "Kurtarma kodu kullan"}</Button>
          </Field> : <>
            {mode === "register" && <Field><FieldLabel htmlFor="name">Adınız soyadınız</FieldLabel><Input id="name" name="name" autoComplete="name" required maxLength={100} disabled={pending || !configured} /></Field>}
            {mode !== "reset" && <Field><FieldLabel htmlFor="email">E-posta adresiniz</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="ornek@eposta.com" disabled={pending || !configured} /></Field>}
            {(mode === "login" || mode === "register" || mode === "reset") && <Field><FieldLabel htmlFor="password">{mode === "reset" ? "Yeni şifreniz" : "Şifreniz"}</FieldLabel><Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} disabled={pending || !configured || invalidReset} /><FieldDescription>En az 8 karakter.</FieldDescription></Field>}
            {(mode === "register" || mode === "reset") && <Field data-invalid={error === "Şifreler eşleşmiyor."}><FieldLabel htmlFor="confirmPassword">Şifrenizi tekrar girin</FieldLabel><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} aria-invalid={error === "Şifreler eşleşmiyor."} disabled={pending || !configured || invalidReset} /></Field>}
            {mode === "login" && <div className="flex items-center justify-between gap-4 text-[13px] max-[681px]:flex-wrap"><Field orientation="horizontal" className="w-auto"><Checkbox id="remember" checked={remember} onCheckedChange={setRemember} disabled={pending || !configured} /><FieldLabel htmlFor="remember">Beni hatırla</FieldLabel></Field><Link href="/akademi/sifremi-unuttum" className="whitespace-nowrap underline underline-offset-4">Şifremi unuttum</Link></div>}
          </>}
          <Button type="submit" size="pill" className="w-full min-h-12" disabled={pending || !configured || invalidReset}>{pending ? <LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" /> : null}{pending ? "Lütfen bekleyin…" : mfa ? "Doğrula ve giriş yap" : labels[mode]}{!pending && <ArrowRight data-icon="inline-end" />}</Button>
        </FieldGroup>
      </form>}
      <nav className="flex flex-col gap-4 text-center text-[14px] [&_a]:underline [&_a]:underline-offset-4" aria-label="Hesap işlemleri">
        {mode === "login" ? <><span>Henüz hesabınız yok mu? <Link href="/akademi/kayit">Hesap oluşturun</Link></span><Link href="/akademi/dogrulama">Doğrulama e-postasını yeniden gönder</Link></> : <Link href="/akademi/giris">Giriş sayfasına dön</Link>}
      </nav>
    </div>
  );
}
