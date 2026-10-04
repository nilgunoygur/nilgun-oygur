"use server";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import type { z } from "zod";
import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { contactSchema, supportSchema } from "@/lib/contact-schema";
import { getDatabase } from "@/lib/db";
import { consumeAttempt } from "@/lib/akademi/rate-limit";
import { deliverPendingEmailsAfterResponse, getEmailOutbox } from "@/lib/email";
import { contactEmail } from "@/lib/email/templates";
import type { FormState } from "@/components/akademi/form-status";

export const sendContactMessage = async (values: z.input<typeof contactSchema>) => send(contactSchema, values);
/** From the Akademi course-add guide; reaches the same inbox with its own subject and the order number. */
export const sendSupportMessage = async (values: z.input<typeof supportSchema>) => send(supportSchema, values);

async function send(schema: typeof contactSchema | typeof supportSchema, values: unknown): Promise<FormState> {
  const failed = (message: string): FormState => ({ status: "error", message });
  const settings = config();
  if (!settings.enabled.contact) return failed("Mesaj şu anda gönderilemiyor. Lütfen e-posta adresimizden bize ulaşın.");
  const input = schema.safeParse(values);
  if (!input.success) return failed("Formdaki bilgileri kontrol edin.");
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
