import { z } from "zod";
import { emailField } from "./auth/forms.ts";
import { optionalOrderNumberField } from "./akademi/claim-schema.ts";
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Lütfen adınızı ve soyadınızı yazın.")
    .max(100, "Adınız en fazla 100 karakter olabilir."),
  email: emailField(),
  message: z
    .string()
    .trim()
    .min(10, "Mesajınız en az 10 karakter olmalıdır.")
    .max(5000, "Mesajınız en fazla 5000 karakter olabilir."),
});
export const subscribeSchema = z.object({ email: emailField().pipe(z.string().max(254, "E-posta adresi en fazla 254 karakter olabilir.")) });
export const supportSchema = contactSchema.extend({ orderNumber: optionalOrderNumberField });
