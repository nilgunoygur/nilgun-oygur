import { z } from "zod";
import { emailField } from "../auth/forms.ts";

export const claimSchema = z.object({
  orderNumber: z.string().trim().regex(/^\d{5,20}$/, "Sipariş numarası yalnızca rakamlardan oluşur."),
  email: emailField("Shopier’de kullandığınız e-posta adresini yazın."),
});
export type ClaimInput = z.input<typeof claimSchema>;
