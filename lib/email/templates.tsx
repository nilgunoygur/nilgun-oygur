import { render } from "@react-email/render";
import VerifyEmail, { verifyEmailSubject, verifyEmailText } from "../../emails/verify-email.tsx";
import ResetPassword, { resetPasswordSubject, resetPasswordText } from "../../emails/reset-password.tsx";
import ContactMessage, { contactMessageSubject, contactMessageText } from "../../emails/contact-message.tsx";
import type { EmailMessage } from "./message.ts";

export async function authenticationEmail(kind: "verification" | "reset", to: string, url: string): Promise<EmailMessage> {
  const reset = kind === "reset";
  return {
    to,
    subject: reset ? resetPasswordSubject : verifyEmailSubject,
    text: reset ? resetPasswordText({ url }) : verifyEmailText({ url }),
    html: await render(reset ? <ResetPassword url={url} /> : <VerifyEmail url={url} />),
    // Matches Better Auth's one-hour token lifetime; an expired link is not worth delivering.
    expiresAt: new Date(Date.now() + 3_600_000),
  };
}

export async function contactEmail(input: { name: string; email: string; message: string }, recipient: string, siteUrl: string): Promise<EmailMessage> {
  const props = { ...input, siteUrl };
  return {
    to: recipient,
    replyTo: input.email,
    subject: contactMessageSubject,
    text: contactMessageText(props),
    html: await render(<ContactMessage {...props} />),
    // Keep retries within Resend's 24-hour idempotency window.
    expiresAt: new Date(Date.now() + 23 * 3_600_000),
  };
}
