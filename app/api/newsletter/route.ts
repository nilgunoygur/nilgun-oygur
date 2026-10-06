import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { subscribeSchema } from "@/lib/contact-schema";
import { getDatabase } from "@/lib/db";
import { consumeAttempt, visitorKey } from "@/lib/akademi/rate-limit";
import { after } from "next/server";
import { subscribe } from "@/lib/newsletter";
import { syncSubscribersToResend } from "@/lib/newsletter-resend";
import type { FormState } from "@/components/akademi/form-status";

// A route, not a server action: BotID protects by path and the form is on every page.
export async function POST(request: Request) {
  const reply = (state: FormState, status = 200) => Response.json(state, { status, headers: { "Cache-Control": "no-store" } });
  const failed = (message: string, status: number) => reply({ status: "error", message }, status);
  const settings = config();
  if (!settings.enabled.newsletter) return failed("Bülten aboneliği şu anda kullanılamıyor.", 503);
  const input = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return failed("Geçerli bir e-posta adresi yazın.", 400);
  try {
    if ((await checkBotId()).isBot) return failed("İstek doğrulanamadı.", 403);
    const db = getDatabase();
    if (!await consumeAttempt(db, `newsletter:${visitorKey(request.headers, settings.auth.emailKey!)}`, { max: 5, windowMs: 3_600_000 })) {
      return failed("Çok fazla deneme yaptınız. Lütfen bir saat sonra tekrar deneyin.", 429);
    }
    await subscribe(db, input.data.email);
    // The daily sync retries anything this misses.
    after(() => syncSubscribersToResend(5).catch(() => {}));
    // Same answer for a repeat address, so the form reveals nothing.
    return reply({ status: "success", message: "Teşekkürler! Bültene kaydınız alındı." });
  } catch {
    return failed("Kaydınız alınamadı. Lütfen biraz sonra tekrar deneyin.", 500);
  }
}
