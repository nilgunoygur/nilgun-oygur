import { setTimeout } from "node:timers/promises";
import type { Resend } from "resend";
import type { DeliverEmail } from "./outbox.ts";

// Brief in-request retries; the outbox backs off for longer outages.
export function createResendDelivery(
  resend: Pick<Resend, "emails">,
  settings: { from: string; replyTo: string },
  wait: (milliseconds: number) => Promise<unknown> = setTimeout,
): DeliverEmail {
  return async (message, key) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await resend.emails.send(
        { ...message, from: settings.from, replyTo: message.replyTo ?? settings.replyTo },
        { idempotencyKey: key },
      );
      if (result.data && !result.error) return result.data.id;
      const status = result.error?.statusCode;
      if (status && status !== 429 && status < 500) break;
      if (attempt < 2) await wait(1000 * (attempt + 1));
    }
    throw new Error("Email provider rejected delivery.");
  };
}
