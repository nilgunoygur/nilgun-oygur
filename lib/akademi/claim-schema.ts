import { z } from "zod";
import { emailField } from "../auth/forms.ts";

/** Here, not in the client component, so the server page can read it. */
export const claimHintCookie = "akademi-claim-hint";
/** A decided refund request is shown on the account page for this long, unless the student closes it. */
export const refundNoticeDays = 14;
export const refundNoticeCookie = (requestId: string) => `akademi-refund-notice-${requestId}`;

const orderNumber = (pattern: RegExp) => z.string().trim().transform(value => value.replace(/^#\s*/, "")).pipe(z.string().regex(pattern, "Sipariş numarası yalnızca rakamlardan oluşur."));
const orderNumberField = orderNumber(/^\d{5,20}$/);
export const optionalOrderNumberField = orderNumber(/^(\d{5,20})?$/);

export const claimSchema = z.object({
  orderNumber: orderNumberField,
  email: emailField("Shopier’de kullandığınız e-posta adresini yazın."),
});
export type ClaimInput = z.input<typeof claimSchema>;

export const refundRequestSchema = z.object({ reason: z.string().trim().min(10, "Nedeninizi en az 10 karakterle yazın.").max(1000, "Neden en fazla 1.000 karakter olabilir.") });
