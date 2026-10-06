// Creates the Resend contact property the newsletter sync fills (visitor, member or buyer). Safe to run again.
// Needs a full-access RESEND_API_KEY. Usage: pnpm run newsletter:setup
import nextEnv from "@next/env";
import { Resend } from "resend";
import { kindProperty } from "../lib/newsletter.ts";

nextEnv.loadEnvConfig(process.cwd());
const resend = new Resend(process.env.RESEND_API_KEY);
const existing = await resend.contactProperties.list();
if (existing.error) throw new Error(`Resend refused the request: ${existing.error.message}`);
if (existing.data.data.some(property => property.key === kindProperty)) console.error(`${kindProperty} already exists.`);
else {
  const created = await resend.contactProperties.create({ key: kindProperty, type: "string", fallbackValue: "visitor" });
  if (created.error) throw new Error(`Resend refused the request: ${created.error.message}`);
  console.error(`Created ${kindProperty}.`);
}
