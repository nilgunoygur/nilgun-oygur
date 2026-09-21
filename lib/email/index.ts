import "server-only";
import { Resend } from "resend";
import { getDatabase } from "@/lib/db";
import { createEmailOutbox } from "./outbox";

export function getEmailOutbox() {
  return createEmailOutbox(getDatabase(), process.env.EMAIL_ENCRYPTION_KEY ?? "");
}

/**
 * Local development without Resend: auth emails (verification, reset links) are printed to the
 * `next dev` terminal. Never active in deployments, where NODE_ENV is always "production".
 */
export function isConsoleEmail() {
  return process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY;
}

export async function deliverPendingEmails() {
  if (isConsoleEmail()) {
    return getEmailOutbox().deliverBatch(async (message, key) => {
      console.info(`\n[akademi dev email] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
      return `console-${key}`;
    });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const replyTo = process.env.RESEND_REPLY_TO;
  if (!apiKey || !from || !replyTo) throw new Error("Resend API key, sender and Reply-To must be configured.");
  const resend = new Resend(apiKey);
  return getEmailOutbox().deliverBatch(async (message, key) => {
    const { data, error } = await resend.emails.send({ ...message, from, replyTo }, { idempotencyKey: key });
    if (error || !data) throw new Error("Email provider rejected delivery.");
    return data.id;
  });
}
