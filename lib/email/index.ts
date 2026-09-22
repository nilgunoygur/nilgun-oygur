import "server-only";
import { Resend } from "resend";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { createEmailOutbox } from "./outbox";

export function getEmailOutbox() {
  return createEmailOutbox(getDatabase(), config().auth.emailKey ?? "");
}

export async function deliverPendingEmails() {
  const { consoleEmail, resend: settings } = config();
  if (consoleEmail) {
    return getEmailOutbox().deliverBatch(async (message, key) => {
      console.info(`\n[akademi dev email] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
      return `console-${key}`;
    });
  }
  const { apiKey, from, replyTo } = settings;
  if (!apiKey || !from || !replyTo) throw new Error("Resend API key, sender and Reply-To must be configured.");
  const resend = new Resend(apiKey);
  return getEmailOutbox().deliverBatch(async (message, key) => {
    const { data, error } = await resend.emails.send({ ...message, from, replyTo }, { idempotencyKey: key });
    if (error || !data) throw new Error("Email provider rejected delivery.");
    return data.id;
  });
}
