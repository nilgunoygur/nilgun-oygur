import { z } from "zod";
import { emailField } from "./auth/forms.ts";
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
/** The support form on the course-add guide: a contact message with an optional Shopier order number. */
export const supportSchema = contactSchema.extend({
  orderNumber: z.string().trim().transform(value => value.replace(/^#\s*/, "")).pipe(z.string().regex(/^(\d{5,20})?$/, "Sipariş numarası yalnızca rakamlardan oluşur.")),
});
