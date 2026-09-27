import { render } from "react-email";
import type { z } from "zod";
import { AuthEmail, authEmailText } from "../../emails/_components/auth-email.tsx";
import { verifyCopy } from "../../emails/verify-email.tsx";
import { resetCopy } from "../../emails/reset-password.tsx";
import ContactMessage, { contactSubject, contactText } from "../../emails/contact-message.tsx";
import type { contactSchema } from "../contact-schema.ts";
import type { EmailMessage } from "./outbox.ts";

const authCopy = { verification: verifyCopy, reset: resetCopy };

export async function authenticationEmail(kind: keyof typeof authCopy, to: string, url: string): Promise<EmailMessage> {
  const copy = authCopy[kind];
  return { to, subject: copy.subject, text: authEmailText(copy, url), html: await render(<AuthEmail copy={copy} url={url} />) };
}

export async function contactEmail(input: z.infer<typeof contactSchema>, recipient: string, siteUrl: string): Promise<EmailMessage> {
  const props = { ...input, siteUrl };
  return { to: recipient, replyTo: input.email, subject: contactSubject, text: contactText(props), html: await render(<ContactMessage {...props} />) };
}
