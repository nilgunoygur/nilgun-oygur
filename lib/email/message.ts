/** The payload is encrypted at rest and erased after delivery or expiry. */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  expiresAt: Date;
};
