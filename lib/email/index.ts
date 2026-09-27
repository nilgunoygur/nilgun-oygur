import "server-only";
import { after } from "next/server";
import { Resend } from "resend";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { createEmailOutbox } from "./outbox";
import { createResendDelivery } from "./transport";

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
  return getEmailOutbox().deliverBatch(createResendDelivery(resend, { from, replyTo }));
}

export async function tryDeliverPendingEmails() {
  try { await deliverPendingEmails(); } catch { console.error("Email delivery could not run; queued messages require retry."); }
}

export function deliverPendingEmailsAfterResponse() {
  after(tryDeliverPendingEmails);
}
