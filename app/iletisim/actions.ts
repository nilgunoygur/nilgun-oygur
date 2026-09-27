"use server";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import type { z } from "zod";
import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { contactSchema } from "@/lib/contact-schema";
import { getDatabase } from "@/lib/db";
import { consumeAttempt } from "@/lib/akademi/rate-limit";
import { deliverPendingEmailsAfterResponse, getEmailOutbox } from "@/lib/email";
import { contactEmail } from "@/lib/email/templates";
import type { FormState } from "@/components/akademi/form-status";

type Fields = z.infer<typeof contactSchema>;
/** `values` refill the form after React resets it; omitted on success. */
export type ContactState = FormState & { errors?: Partial<Record<keyof Fields, string>>; values?: Fields };

export async function sendContactMessage(_: ContactState, formData: FormData): Promise<ContactState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""), message: String(formData.get("message") ?? "") };
  const failed = (message: string): ContactState => ({ status: "error", message, values });
  const settings = config();
  if (!settings.enabled.contact) return failed("Mesaj şu anda gönderilemiyor. Lütfen e-posta adresimizden bize ulaşın.");
  const input = contactSchema.safeParse(values);
  if (!input.success) return { status: "idle", message: "", values, errors: Object.fromEntries(input.error.issues.map(issue => [issue.path[0], issue.message])) };
  try {
    if ((await checkBotId()).isBot) return failed("İstek doğrulanamadı.");
    const ip = (await headers()).get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
    // Persist a keyed hash rather than visitors' IP addresses.
    const key = createHmac("sha256", settings.auth.emailKey!).update(ip).digest("hex");
    if (!await consumeAttempt(getDatabase(), `contact:${key}`, { max: 3, windowMs: 3_600_000, now: Date.now() })) {
      return failed("Çok fazla mesaj gönderdiniz. Lütfen bir saat sonra tekrar deneyin.");
    }
    await getEmailOutbox().enqueue(await contactEmail(input.data, settings.resend.replyTo!, settings.siteUrl));
    deliverPendingEmailsAfterResponse();
    return { status: "success", message: "Mesajınız alındı. En kısa sürede size dönüş yapacağız." };
  } catch {
    return failed("Mesajınız alınamadı. Lütfen biraz sonra tekrar deneyin veya bize e-posta gönderin.");
  }
}
