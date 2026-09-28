import { z } from "zod";
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Lütfen adınızı ve soyadınızı yazın.")
    .max(100, "Adınız en fazla 100 karakter olabilir."),
  email: z.string().trim().min(1, "E-posta adresinizi yazın.").pipe(z.email("Geçerli bir e-posta adresi yazın.")),
  message: z
    .string()
    .trim()
    .min(10, "Mesajınız en az 10 karakter olmalıdır.")
    .max(5000, "Mesajınız en fazla 5000 karakter olabilir."),
});
