import { createHmac } from "node:crypto";
import { after } from "next/server";
import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { contactSchema } from "@/lib/contact-schema";
import { getDatabase } from "@/lib/db";
import { consumeAttempt } from "@/lib/akademi/rate-limit";
import { deliverPendingEmails, getEmailOutbox } from "@/lib/email";
import { contactEmail } from "@/lib/email/templates";

const headers = { "Cache-Control": "no-store" };
const response = (message: string, status: number) => Response.json({ message }, { status, headers });

export async function POST(request: Request) {
  const settings = config();
  if (!settings.enabled.email || !settings.resend.replyTo) return response("Mesaj şu anda gönderilemiyor. Lütfen e-posta adresimizden bize ulaşın.", 503);
  if (request.headers.get("origin") !== new URL(settings.siteUrl).origin) return response("İstek doğrulanamadı.", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 24_000) return response("Mesajınız çok uzun.", 413);
  try {
    if ((await checkBotId()).isBot) return response("İstek doğrulanamadı.", 403);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 24_000) return response("Mesajınız çok uzun.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return response("Lütfen formu kontrol edin.", 400); }
    const input = contactSchema.safeParse(body);
    if (!input.success) return response(input.error.issues[0].message, 400);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
    // Persist a keyed hash rather than visitors' IP addresses.
    const key = createHmac("sha256", settings.auth.emailKey!).update(ip).digest("hex");
    if (!await consumeAttempt(getDatabase(), `contact:${key}`, { max: 3, windowMs: 3_600_000, now: Date.now() })) {
      return response("Çok fazla mesaj gönderdiniz. Lütfen bir saat sonra tekrar deneyin.", 429);
    }
    await getEmailOutbox().enqueue(await contactEmail(input.data, settings.resend.replyTo, settings.siteUrl));
    after(async () => {
      try { await deliverPendingEmails(); } catch { console.error("Contact email delivery could not run; queued messages require retry."); }
    });
    return response("Mesajınız alındı. En kısa sürede size dönüş yapacağız.", 202);
  } catch {
    return response("Mesajınız alınamadı. Lütfen biraz sonra tekrar deneyin veya bize e-posta gönderin.", 503);
  }
}
