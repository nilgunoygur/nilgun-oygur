import "server-only";
import { Resend } from "resend";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import { syncContacts } from "@/lib/newsletter";

const contacts = () => {
  const { resend, enabled } = config();
  return enabled.newsletter && resend.apiKey ? new Resend(resend.apiKey).contacts : null;
};

/** Does nothing without a Resend key (local development). */
export async function syncSubscribersToResend(limit?: number) {
  const resend = contacts();
  return resend ? syncContacts(getDatabase(), resend, { limit }) : { pending: 0, synced: 0 };
}

/** False when Resend could not remove the contact; a contact it never had counts as removed. */
export async function removeResendContact(email: string) {
  const { error } = await contacts()?.remove({ email }) ?? { error: null };
  return !error || error.statusCode === 404;
}
