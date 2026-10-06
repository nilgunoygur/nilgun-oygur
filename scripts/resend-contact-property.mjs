// Creates the Resend contact properties the newsletter sync fills. Safe to run again.
// Needs a full-access RESEND_API_KEY. Usage: pnpm run newsletter:setup
import nextEnv from "@next/env";
import { Resend } from "resend";
import { kindProperty, optInProperty } from "../lib/newsletter.ts";

nextEnv.loadEnvConfig(process.cwd());
const resend = new Resend(process.env.RESEND_API_KEY);
const existing = await resend.contactProperties.list();
if (existing.error) throw new Error(`Resend refused the request: ${existing.error.message}`);
for (const [key, fallbackValue] of [[kindProperty, "visitor"], [optInProperty, "no"]]) {
  if (existing.data.data.some(property => property.key === key)) { console.error(`${key} already exists.`); continue; }
  const created = await resend.contactProperties.create({ key, type: "string", fallbackValue });
  if (created.error) throw new Error(`Resend refused the request: ${created.error.message}`);
  console.error(`Created ${key}.`);
}
