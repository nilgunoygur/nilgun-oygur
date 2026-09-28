import { z } from "zod";

/** "Siparişimi ekle": validated by the form and again by the server action. */
export const claimSchema = z.object({
  orderNumber: z.string().trim().regex(/^\d{5,20}$/, "Sipariş numarası yalnızca rakamlardan oluşur."),
  email: z.string().trim().min(1, "Shopier’de kullandığınız e-posta adresini yazın.").pipe(z.email("Geçerli bir e-posta adresi yazın.")),
});
export type ClaimInput = z.input<typeof claimSchema>;
