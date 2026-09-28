import { z } from "zod";
import { contactInput } from "./profile.ts";

// Form schemas shared by the React Hook Form resolvers and the server actions that re-validate the same input.

export const emailField = z.string().trim().min(1, "E-posta adresinizi yazın.").pipe(z.email("Geçerli bir e-posta adresi yazın."));
const newPassword = z.string().min(8, "Şifreniz en az 8 karakter olmalıdır.").max(128, "Şifreniz en fazla 128 karakter olabilir.");
const matching = <T extends { password: string; confirmPassword: string }>(value: T) => value.password === value.confirmPassword;
const mismatch = { path: ["confirmPassword"], message: "Şifreler eşleşmiyor." };

export const loginSchema = z.object({ email: emailField, password: z.string().min(1, "Şifrenizi yazın."), remember: z.boolean() });
export const emailLinkSchema = z.object({ email: emailField });
export const resetSchema = z.object({ password: newPassword, confirmPassword: z.string() }).refine(matching, mismatch);
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Adınızı ve soyadınızı yazın.").max(100, "Ad en fazla 100 karakter olabilir."),
  email: emailField, password: newPassword, confirmPassword: z.string(), contact: contactInput,
}).refine(matching, mismatch);
export const totpSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Doğrulayıcı uygulamanızdaki 6 haneli kodu girin.") });
export const backupCodeSchema = z.object({ code: z.string().trim().min(1, "Kurtarma kodunuzu girin.").max(64) });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1, "Mevcut şifrenizi yazın."), password: newPassword, confirmPassword: z.string() })
  .refine(matching, { path: ["confirmPassword"], message: "Yeni şifreler eşleşmiyor." });
export const contactFormSchema = z.object({ contact: contactInput });
