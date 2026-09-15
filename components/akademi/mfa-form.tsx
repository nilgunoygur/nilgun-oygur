"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "@/lib/auth/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MfaForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const setup = !enabled && !secret;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setError(""); setPending(true);
    try {
      if (setup) {
        const result = await authClient.twoFactor.enable({ password: String(fields.get("password")) });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        if (result.data.method !== "totp") { setError("Doğrulayıcı kurulumu başlatılamadı."); return; }
        setSecret(new URL(result.data.totpURI).searchParams.get("secret") ?? "");
        setBackupCodes(result.data.backupCodes ?? []);
      } else {
        const result = await authClient.twoFactor.verifyTotp({ code: String(fields.get("code")).trim(), trustDevice: false });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        if (backupCodes.length) { setSecret(""); setVerified(true); }
        else { router.replace("/yonetim"); router.refresh(); }
      }
    } catch { setError("Bağlantı kurulamadı. Lütfen yeniden deneyin."); }
    finally { setPending(false); }
  }

  if (verified) return <div className="academy-form-stack"><Alert><AlertDescription>İki aşamalı doğrulama etkinleştirildi. Telefonunuza erişemezseniz aşağıdaki tek kullanımlık kurtarma kodlarını kullanabilirsiniz.</AlertDescription></Alert><p>Kodları güvenli bir yerde saklayın:</p><ul className="academy-security-key">{backupCodes.map(code => <li key={code}><code>{code}</code></li>)}</ul><Button size="pill" onClick={() => { setBackupCodes([]); router.replace("/yonetim"); router.refresh(); }}>Kodları kaydettim, devam et</Button></div>;
  return <div className="academy-form-stack">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {secret && <><p>Doğrulayıcı uygulamanızda yeni bir hesap ekleyin. Kurulum anahtarı olarak aşağıdaki kodu, tür olarak zamana dayalı kodu seçin.</p><code className="academy-security-key">{secret}</code></>}
    <form onSubmit={submit} aria-busy={pending}><FieldGroup><Field>
      <FieldLabel htmlFor={setup ? "password" : "code"}>{setup ? "Mevcut şifreniz" : "Doğrulama kodu"}</FieldLabel>
      {setup ? <Input key="password" id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required disabled={pending} /> : <Input key="code" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={pending} />}
      <FieldDescription>{setup ? "Doğrulayıcı uygulaması kurulumunu başlatmak için şifrenizi girin." : "Uygulamanızda görünen güncel 6 haneli kodu girin."}</FieldDescription>
    </Field><Button size="pill" type="submit" disabled={pending}>{pending ? "Lütfen bekleyin…" : setup ? "Doğrulayıcıyı kur" : "Kodu doğrula"}</Button></FieldGroup></form>
  </div>;
}
