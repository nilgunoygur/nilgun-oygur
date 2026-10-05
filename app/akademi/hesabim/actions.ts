"use server";
import { deliverPendingEmailsAfterResponse } from "@/lib/email";
import { refresh } from "next/cache";
import { requireStudent } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { z } from "zod";
import { claimSchema, refundRequestSchema, type ClaimInput } from "@/lib/akademi/claim-schema";
import type { FormState } from "@/components/akademi/form-status";

const student = () => requireStudent().catch(() => null);
const signedOut: FormState = { status: "error", message: "Lütfen yeniden giriş yapın." };

const messages = {
  granted: "Eğitiminiz hesabınıza eklendi.",
  already_yours: "Bu sipariş zaten hesabınızda.",
  claimed_by_other: "Bu sipariş başka bir hesaba eklenmiş. Yardım için bizimle iletişime geçin.",
  not_found: "Sipariş bulunamadı. Numarayı ve Shopier’de kullandığınız e-posta adresini kontrol edin.",
  unpaid: "Shopier siparişi bulundu ancak ödeme henüz onaylanmamış. Ödeme onaylandıktan sonra tekrar deneyin.",
  not_academy: "Bu sipariş bir Akademi eğitimi içermiyor.",
  refunded: "Bu siparişin ödemesi tamamen iade edilmiş. Eğitim erişimi eklenemez.",
  rate_limited: "Çok fazla deneme yaptınız. Lütfen bir saat sonra yeniden deneyin.",
} as const;

export async function claimOrder(values: ClaimInput): Promise<FormState> {
  const viewer = await student();
  if (!viewer) return signedOut;
  const input = claimSchema.safeParse(values);
  if (!input.success) return { status: "error", message: input.error.issues[0].message };
  try {
    const outcome = await akademi().access.claimOrder(viewer.user.id, input.data.orderNumber, input.data.email);
    if (outcome === "granted") refresh();
    return { status: outcome === "granted" || outcome === "already_yours" ? "success" : "error", message: messages[outcome] };
  } catch {
    return { status: "error", message: "Sipariş şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin." };
  }
}

const refundMessages = {
  requested: "İade talebiniz alındı. Sonucu bu sayfada görebilirsiniz.",
  already_pending: "Bu eğitim için incelenen bir iade talebiniz var.",
  no_purchase: "Bu eğitim için iade talebi oluşturulamıyor. Yardım için bizimle iletişime geçin.",
  refunded: "Bu siparişin ödemesi zaten iade edilmiş.",
  rate_limited: "Çok fazla talep oluşturdunuz. Lütfen yarın yeniden deneyin.",
} as const;

export async function requestRefund(courseId: string, values: z.input<typeof refundRequestSchema>): Promise<FormState> {
  const viewer = await student();
  if (!viewer) return signedOut;
  const input = refundRequestSchema.safeParse(values);
  if (!z.uuid().safeParse(courseId).success || !input.success) return { status: "error", message: input.error?.issues[0].message ?? "Geçersiz istek." };
  try {
    const outcome = await akademi().access.requestRefund(viewer.user.id, courseId, input.data.reason);
    if (outcome === "requested") { deliverPendingEmailsAfterResponse(); refresh(); }
    return { status: outcome === "requested" ? "success" : "error", message: refundMessages[outcome] };
  } catch {
    return { status: "error", message: "İade talebi şu anda alınamıyor. Lütfen biraz sonra yeniden deneyin." };
  }
}
