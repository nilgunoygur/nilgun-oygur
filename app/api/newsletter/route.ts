import { createHmac } from "node:crypto";
import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { subscribeSchema } from "@/lib/contact-schema";
import { getDatabase } from "@/lib/db";
import { consumeAttempt } from "@/lib/akademi/rate-limit";
import { subscribe } from "@/lib/newsletter";
import type { FormState } from "@/components/akademi/form-status";

// A route rather than a server action: the form sits in the footer of every page, and BotID protects by path.
export async function POST(request: Request) {
  const reply = (state: FormState, status = 200) => Response.json(state, { status, headers: { "Cache-Control": "no-store" } });
  const failed = (message: string, status: number) => reply({ status: "error", message }, status);
  const settings = config();
  if (!settings.enabled.newsletter) return failed("Bülten aboneliği şu anda kullanılamıyor.", 503);
  const input = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return failed("Geçerli bir e-posta adresi yazın.", 400);
  try {
    if ((await checkBotId()).isBot) return failed("İstek doğrulanamadı.", 403);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
    // Persist a keyed hash rather than visitors' IP addresses.
    const key = createHmac("sha256", settings.auth.emailKey!).update(ip).digest("hex");
    const db = getDatabase();
    if (!await consumeAttempt(db, `newsletter:${key}`, { max: 5, windowMs: 3_600_000 })) {
      return failed("Çok fazla deneme yaptınız. Lütfen bir saat sonra tekrar deneyin.", 429);
    }
    await subscribe(db, input.data.email);
    // The same answer for a new and an already subscribed address.
    return reply({ status: "success", message: "Teşekkürler! Bültene kaydınız alındı." });
  } catch {
    return failed("Kaydınız alınamadı. Lütfen biraz sonra tekrar deneyin.", 500);
  }
}
