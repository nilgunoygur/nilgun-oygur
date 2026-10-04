import { z } from "zod";
import { emailField } from "../auth/forms.ts";

/** Set when the student closes the "purchase not showing?" hint; a server page cannot read a constant exported from a client file. */
export const claimHintCookie = "akademi-claim-hint";

export const claimSchema = z.object({
  orderNumber: z.string().trim().transform(value => value.replace(/^#\s*/, "")).pipe(z.string().regex(/^\d{5,20}$/, "Sipariş numarası yalnızca rakamlardan oluşur.")),
  email: emailField("Shopier’de kullandığınız e-posta adresini yazın."),
});
export type ClaimInput = z.input<typeof claimSchema>;

export const refundRequestSchema = z.object({ reason: z.string().trim().min(10, "Nedeninizi en az 10 karakterle yazın.").max(1000, "Neden en fazla 1.000 karakter olabilir.") });
