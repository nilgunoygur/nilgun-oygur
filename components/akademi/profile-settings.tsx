"use client";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { avatarSource } from "@/lib/auth/profile";
import { saveProfile } from "@/app/akademi/hesabim/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { FormStatus, idleForm, type FormState } from "./form-status";

export function ProfileSettings({ user, localEmail, onSaved }: { user: { name: string; email: string; image?: string | null }; localEmail: boolean; onSaved: () => void }) {
  const id = useId();
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState<string | null>(avatarSource(user.image) ?? null);
  const [profile, setProfile] = useState<FormState>(idleForm);
  const [password, setPassword] = useState<FormState>(idleForm);
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [show, setShow] = useState(false);
  return <div className="grid gap-6">
    <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { const result = await saveProfile({ name, image }); setProfile(result); if (result.status === "success") onSaved(); } catch { setProfile({ status: "error", message: "Profil kaydedilemedi. Lütfen tekrar deneyin." }); } finally { setBusy(false); } }}>
      <FieldGroup>
        <div className="flex items-center gap-4"><Avatar className="size-16"><AvatarImage src={image ?? undefined} alt="Profil fotoğrafınız" /><AvatarFallback>{name.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><Field><FieldLabel htmlFor={`${id}-photo`}>Profil fotoğrafı</FieldLabel><Input id={`${id}-photo`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
          const file = event.target.files?.[0]; if (!file) return;
          setBusy(true);
          try {
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error();
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
            const context = canvas.getContext("2d"); if (!context) throw new Error();
            const side = Math.min(bitmap.width, bitmap.height);
            context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256); bitmap.close();
            const value = canvas.toDataURL("image/webp", 0.8); if (value.length > 100000) throw new Error();
            setImage(value); setProfile(idleForm);
          } catch { setProfile({ status: "error", message: "10 MB altında bir JPG, PNG veya WebP fotoğrafı seçin." }); }
          finally { setBusy(false); }
        }} /><FieldDescription>JPG, PNG veya WebP · En fazla 10 MB</FieldDescription></Field>{image && <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)}>Fotoğrafı kaldır</Button>}</div></div>
        <Field><FieldLabel htmlFor={`${id}-name`}>Adınız soyadınız</FieldLabel><Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required autoComplete="name" /></Field>
        <Field><FieldLabel htmlFor={`${id}-email`}>E-posta adresiniz</FieldLabel><Input id={`${id}-email`} value={user.email} readOnly type="email" /></Field>
        <FormStatus state={profile} /><Button disabled={busy} type="submit">{busy ? "Kaydediliyor…" : "Profili kaydet"}</Button>
      </FieldGroup>
    </form>
    <Separator />
    <form onSubmit={async (event) => {
      event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
      const newPassword = String(values.get("newPassword"));
      if (newPassword !== values.get("confirmPassword")) { setPassword({ status: "error", message: "Yeni şifreler eşleşmiyor." }); return; }
      setPasswordBusy(true);
      try { const result = await authClient.changePassword({ currentPassword: String(values.get("currentPassword")), newPassword, revokeOtherSessions: true });
        if (result.error) { setPassword({ status: "error", message: "Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin." }); }
        else { form.reset(); setPassword({ status: "success", message: "Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı." }); }
      } catch { setPassword({ status: "error", message: "Şifre değiştirilemedi. Lütfen tekrar deneyin." }); }
      finally { setPasswordBusy(false); }
    }}>
      <FieldGroup><h3 className="font-semibold">Şifrenizi değiştirin</h3>
        {[['currentPassword', 'Mevcut şifreniz'], ['newPassword', 'Yeni şifreniz'], ['confirmPassword', 'Yeni şifreniz (tekrar)']].map(([key, label]) => <Field key={key}><FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel><Input id={`${id}-${key}`} name={key} type={show ? "text" : "password"} autoComplete={key === "currentPassword" ? "current-password" : "new-password"} minLength={8} maxLength={128} required /></Field>)}
        <Button type="button" variant="ghost" size="sm" aria-pressed={show} onClick={() => setShow(!show)}>{show ? "Şifreleri gizle" : "Şifreleri göster"}</Button>
        <FormStatus state={password} /><Button type="submit" disabled={passwordBusy}>{passwordBusy ? "İşleniyor…" : "Şifreyi değiştir"}</Button>
        <Button type="button" variant="link" className="h-auto whitespace-normal text-center" disabled={passwordBusy} onClick={async () => {
          setPasswordBusy(true);
          try { const result = await authClient.requestPasswordReset({ email: user.email, redirectTo: "/akademi/sifre-yenile" }); if (result.error) throw new Error(); setPassword({ status: "success", message: localEmail ? "Şifre sıfırlama bağlantısı geliştirme terminaline yazıldı." : "Şifre sıfırlama bağlantısı için e-posta kutunuzu kontrol edin." }); }
          catch { setPassword({ status: "error", message: "Bağlantı gönderilemedi. Lütfen tekrar deneyin." }); }
          finally { setPasswordBusy(false); }
        }}>Şifremi unuttum · Sıfırlama bağlantısı gönder</Button>
      </FieldGroup>
    </form>
  </div>;
}
