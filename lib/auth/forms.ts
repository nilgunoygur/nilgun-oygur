import { z } from "zod";

// No contact imports: keeps sign-in pages light.

export const emailField = (required = "E-posta adresinizi yazın.") => z.string().trim().min(1, required).pipe(z.email("Geçerli bir e-posta adresi yazın."));
export const newPassword = z.string().min(8, "Şifreniz en az 8 karakter olmalıdır.").max(128, "Şifreniz en fazla 128 karakter olabilir.");
export const matchingPasswords = (value: { password: string; confirmPassword: string }) => value.password === value.confirmPassword;
export const mismatch = { path: ["confirmPassword"], message: "Şifreler eşleşmiyor." };

export const loginSchema = z.object({ email: emailField(), password: z.string().min(1, "Şifrenizi yazın."), remember: z.boolean() });
export const emailLinkSchema = z.object({ email: emailField() });
export const resetSchema = z.object({ password: newPassword, confirmPassword: z.string() }).refine(matchingPasswords, mismatch);
export const totpSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Doğrulayıcı uygulamanızdaki 6 haneli kodu girin.") });
export const backupCodeSchema = z.object({ code: z.string().trim().min(1, "Kurtarma kodunuzu girin.").max(64) });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1, "Mevcut şifrenizi yazın."), password: newPassword, confirmPassword: z.string() })
  .refine(matchingPasswords, { path: ["confirmPassword"], message: "Yeni şifreler eşleşmiyor." });
