"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import type { FormState } from "@/components/akademi/form-status";

const claimSchema = z.object({
  orderNumber: z.string().trim().regex(/^\d{5,20}$/, "Sipariş numarası yalnızca rakamlardan oluşur."),
  email: z.email("Shopier’de kullandığınız e-posta adresini yazın."),
});

const messages = {
  granted: "Eğitiminiz hesabınıza eklendi.",
  already_yours: "Bu sipariş zaten hesabınızda.",
  claimed_by_other: "Bu sipariş başka bir hesaba eklenmiş. Yardım için bizimle iletişime geçin.",
  not_found: "Sipariş bulunamadı. Numarayı ve Shopier’de kullandığınız e-posta adresini kontrol edin.",
  unpaid: "Shopier siparişi bulundu ancak ödeme henüz onaylanmamış. Ödeme onaylandıktan sonra tekrar deneyin.",
  not_academy: "Bu sipariş bir Akademi eğitimi içermiyor.",
  rate_limited: "Çok fazla deneme yaptınız. Lütfen bir saat sonra yeniden deneyin.",
} as const;

export async function claimOrder(_: FormState, formData: FormData): Promise<FormState> {
  let viewer;
  try { viewer = await requireStudent(); } catch { return { status: "error", message: "Lütfen yeniden giriş yapın." }; }
  const input = claimSchema.safeParse({ orderNumber: formData.get("orderNumber"), email: formData.get("email") });
  if (!input.success) return { status: "error", message: input.error.issues[0].message };
  try {
    const outcome = await akademi().access.claimOrder(viewer.user.id, input.data.orderNumber, input.data.email);
    if (outcome === "granted") refresh();
    return { status: outcome === "granted" || outcome === "already_yours" ? "success" : "error", message: messages[outcome] };
  } catch {
    return { status: "error", message: "Sipariş şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin." };
  }
}
