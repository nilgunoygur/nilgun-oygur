"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth/authorization";
import { claimOrderForStudent, consumeClaimAttempt } from "@/lib/akademi/server";
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
  not_academy: "Bu sipariş bir Akademi eğitimi içermiyor.",
} as const;

export async function claimOrder(_: FormState, formData: FormData): Promise<FormState> {
  let session;
  try { session = await requireStudent(); } catch { return { status: "error", message: "Lütfen yeniden giriş yapın." }; }
  const input = claimSchema.safeParse({ orderNumber: formData.get("orderNumber"), email: formData.get("email") });
  if (!input.success) return { status: "error", message: input.error.issues[0].message };
  if (!await consumeClaimAttempt(session.user.id)) return { status: "error", message: "Çok fazla deneme yaptınız. Lütfen bir saat sonra yeniden deneyin." };
  try {
    const outcome = await claimOrderForStudent(input.data.orderNumber, input.data.email, session.user.id);
    if (outcome === "granted") revalidatePath("/akademi/hesabim");
    return { status: outcome === "granted" || outcome === "already_yours" ? "success" : "error", message: messages[outcome] };
  } catch {
    return { status: "error", message: "Sipariş şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin." };
  }
}
