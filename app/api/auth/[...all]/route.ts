import { after } from "next/server";
import { checkBotId } from "botid/server";
import { config } from "@/lib/config";
import { getAuth } from "@/lib/auth";
import { deliverPendingEmails } from "@/lib/email";

const authHeaders = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
// Also listed in instrumentation-client.ts, which attaches the BotID challenge to these requests.
const botChecked = /\/(sign-up\/email|sign-in\/email|request-password-reset|send-verification-email)$/;
const sendsEmail = /\/(sign-up\/email|request-password-reset|send-verification-email)$/;

async function handle(request: Request) {
  if (!config().enabled.auth) return Response.json({ error: "Akademi hesap işlemleri henüz kullanıma açılmadı." }, { status: 503, headers: authHeaders });
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && botChecked.test(path) && (await checkBotId()).isBot) {
    return Response.json({ error: "İstek doğrulanamadı." }, { status: 403, headers: authHeaders });
  }
  const response = await getAuth().handler(request);
  for (const [key, value] of Object.entries(authHeaders)) response.headers.set(key, value);
  if (request.method === "POST" && sendsEmail.test(path)) {
    after(async () => {
      try { await deliverPendingEmails(); } catch { console.error("Akademi email delivery could not run; queued messages require retry."); }
    });
  }
  return response;
}
export const GET = handle;
export const POST = handle;
