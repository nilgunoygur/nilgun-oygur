"use client";
import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { accountCard } from "@/lib/styles";
import { authClient } from "@/lib/auth/client";
import { avatarSource, profileInput } from "@/lib/auth/profile";
import { contactFormSchema, contactFormValues, hasCompleteContact, type Contact } from "@/lib/auth/contact";
import { passwordChangeSchema } from "@/lib/auth/forms";
import { saveContact, saveProfile } from "@/app/akademi/hesabim/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { idleForm, type FormState } from "./form-status";
import { ContactFields } from "./contact-fields";
import { authAttempt, FormMessage, FormShell, PasswordField, SubmitButton, submitAction, TextField } from "./form-fields";

type User = { name: string; email: string; image?: string | null };

export function ProfileSettings({ user, contact, localEmail }: { user: User; contact: Contact; localEmail: boolean }) {
  return <div className="grid gap-8">
    <PersonalForm user={user} />
    <ContactForm contact={contact} />
    <PasswordForm email={user.email} localEmail={localEmail} />
  </div>;
}

function CardHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-2"><h2 className="text-2xl font-semibold text-forest">{title}</h2><p className="mt-2 text-sm text-stone">{description}</p></div>;
}

/** 256px WebP square, small enough to store with the profile. */
async function avatarFrom(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error();
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d"); if (!context) throw new Error();
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256); bitmap.close();
  const value = canvas.toDataURL("image/webp", 0.8); if (value.length > 100000) throw new Error();
  return value;
}

function PersonalForm({ user }: { user: User }) {
  const { refetch } = authClient.useSession();
  const id = useId();
  const [status, setStatus] = useState<FormState>(idleForm);
  const [processing, setProcessing] = useState(false);
  const form = useForm({ resolver: zodResolver(profileInput), mode: "onTouched", defaultValues: { name: user.name, image: avatarSource(user.image) ?? null } });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(form, () => saveProfile(values), "Profil kaydedilemedi. Lütfen tekrar deneyin.");
    setStatus(result ?? idleForm);
    if (result) { form.reset(values); void refetch(); }
  });
  const name = useWatch({ control: form.control, name: "name" });
  return <FormShell form={form} onSubmit={submit} size="lg" busy={processing} className={accountCard}>
    <CardHeading title="Kişisel bilgiler" description="Adınızı ve profil fotoğrafınızı güncelleyin." />
    <Controller control={form.control} name="image" render={({ field, fieldState }) => (
      <div className="flex items-center gap-4">
        <Avatar className="size-16"><AvatarImage src={field.value ?? undefined} alt="Profil fotoğrafınız" /><AvatarFallback>{name.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar>
        <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${id}-photo`}>Profil fotoğrafı</FieldLabel>
          <Input id={`${id}-photo`} ref={field.ref} type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={fieldState.invalid} onChange={async (event) => {
            const file = event.target.files?.[0]; if (!file) return;
            setProcessing(true);
            try { field.onChange(await avatarFrom(file)); form.clearErrors("image"); }
            catch { form.setError("image", { message: "10 MB altında bir JPG, PNG veya WebP fotoğrafı seçin." }); }
            finally { setProcessing(false); }
          }} />
          <FieldDescription>JPG, PNG veya WebP · En fazla 10 MB</FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          {field.value && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => field.onChange(null)}>Fotoğrafı kaldır</Button>}
        </Field>
      </div>
    )} />
    <TextField control={form.control} name="name" label="Adınız soyadınız" autoComplete="name" maxLength={100} />
    <Field><FieldLabel>E-posta adresiniz</FieldLabel><p className="rounded-lg bg-mist px-4 py-3 text-sm text-stone">{user.email}</p><FieldDescription>Bu adres hesap ayarlarından değiştirilemez.</FieldDescription></Field>
    <FormMessage status={status} />
    <SubmitButton busy={processing}>Profili kaydet</SubmitButton>
  </FormShell>;
}

function ContactForm({ contact }: { contact: Contact }) {
  const [status, setStatus] = useState<FormState>(idleForm);
  const form = useForm({ resolver: zodResolver(contactFormSchema), mode: "onTouched", defaultValues: { contact: contactFormValues(contact) } });
  const submit = form.handleSubmit(async ({ contact: values }) => {
    const result = await submitAction(form, () => saveContact(values), "İletişim bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
    setStatus(result ?? idleForm);
    if (result) form.reset({ contact: contactFormValues(values) });
  });
  return <FormShell form={form} onSubmit={submit} size="lg" id="iletisim" className={accountCard}>
    <CardHeading title="İletişim bilgileri" description="Eğitimlerinizle ilgili size ulaşabilmemiz için telefon ve adresinizi güncel tutun." />
    {!hasCompleteContact(contact) && <Alert><AlertDescription>Telefon veya adres bilginiz eksik. Lütfen tamamlayın.</AlertDescription></Alert>}
    <ContactFields />
    <FormMessage status={status} />
    <SubmitButton>İletişim bilgilerini kaydet</SubmitButton>
  </FormShell>;
}

function PasswordForm({ email, localEmail }: { email: string; localEmail: boolean }) {
  const [status, setStatus] = useState<FormState>(idleForm);
  const [sending, setSending] = useState(false);
  const form = useForm({ resolver: zodResolver(passwordChangeSchema), mode: "onTouched", defaultValues: { currentPassword: "", password: "", confirmPassword: "" } });
  const submit = form.handleSubmit(async ({ currentPassword, password }) => {
    setStatus(idleForm);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword: password, revokeOtherSessions: true });
      if (result.error) { form.setError("currentPassword", { message: "Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin." }); return; }
      form.reset(); setStatus({ status: "success", message: "Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı." });
    } catch { form.setError("root", { message: "Şifre değiştirilemedi. Lütfen tekrar deneyin." }); }
  });
  const sendReset = async () => {
    setSending(true); setStatus(idleForm); form.clearErrors("root");
    if (await authAttempt(form, () => authClient.requestPasswordReset({ email, redirectTo: "/akademi/sifre-yenile" }))) {
      setStatus({ status: "success", message: localEmail ? "Şifre sıfırlama bağlantısı geliştirme terminaline yazıldı." : "Şifre sıfırlama bağlantısı için e-posta kutunuzu kontrol edin." });
    }
    setSending(false);
  };
  return <FormShell form={form} onSubmit={submit} size="lg" busy={sending} className={accountCard}>
    <CardHeading title="Şifrenizi değiştirin" description="Hesabınızı güvende tutmak için güçlü bir şifre seçin." />
    <PasswordField control={form.control} name="currentPassword" label="Mevcut şifreniz" autoComplete="current-password" />
    <PasswordField control={form.control} name="password" label="Yeni şifreniz" autoComplete="new-password" description="En az 8 karakter." />
    <PasswordField control={form.control} name="confirmPassword" label="Yeni şifreniz (tekrar)" autoComplete="new-password" />
    <FormMessage status={status} />
    <SubmitButton pendingLabel="İşleniyor…">Şifreyi değiştir</SubmitButton>
    <Button type="button" variant="link" className="h-auto whitespace-normal text-center" onClick={sendReset}>Şifremi unuttum · Sıfırlama bağlantısı gönder</Button>
  </FormShell>;
}
