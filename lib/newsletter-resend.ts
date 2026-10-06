import "server-only";
import { Resend } from "resend";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { syncContacts } from "@/lib/newsletter";

const contacts = () => {
  const key = config().resend.apiKey;
  return key ? new Resend(key).contacts : null;
};

/** Does nothing without a Resend key (local development). */
export async function syncSubscribersToResend(email?: string) {
  const resend = contacts();
  if (!resend) return { pending: 0, synced: 0 };
  const result = await syncContacts(getDatabase(), resend, { email });
  if (result.synced < result.pending) console.error(`Newsletter sync: Resend refused ${result.pending - result.synced} contacts.`);
  return result;
}

/** A contact Resend never had counts as removed. */
export async function removeResendContact(email: string) {
  const resend = contacts();
  if (!resend) return true;
  const { error } = await resend.remove({ email });
  return !error || error.statusCode === 404;
}
