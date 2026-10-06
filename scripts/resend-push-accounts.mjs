// One-time: adds verified accounts that never used the newsletter form to Resend, marked newsletter_opt_in = "no".
// Lists them without --send. Usage: pnpm run newsletter:push-accounts [--send]
import { setTimeout } from "node:timers/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { Resend } from "resend";
import { verifiedDatabaseUrl } from "../lib/db/connection-url.ts";
import * as schema from "../lib/db/schema.ts";
import { accountsOutsideNewsletter, kindProperty, optInProperty } from "../lib/newsletter.ts";

nextEnv.loadEnvConfig(process.cwd());
const send = process.argv.includes("--send");
const pool = new pg.Pool({ connectionString: verifiedDatabaseUrl(process.env.DATABASE_URL ?? ""), max: 1 });
try {
  const accounts = await accountsOutsideNewsletter(drizzle(pool, { schema }));
  const kinds = Object.groupBy(accounts, account => account.kind);
  console.error(`${accounts.length} accounts: ${kinds.buyer?.length ?? 0} buyers, ${kinds.member?.length ?? 0} members.${send ? "" : " Nothing sent; add --send."}`);
  const { contacts } = new Resend(process.env.RESEND_API_KEY);
  let failed = 0;
  for (const { email, kind } of send ? accounts : []) {
    if ((await contacts.create({ email, properties: { [kindProperty]: kind, [optInProperty]: "no" } })).error) failed++;
    await setTimeout(600);
  }
  if (send) console.error(`Sent ${accounts.length - failed}, failed ${failed}.`);
  if (failed) process.exitCode = 1;
} finally { await pool.end(); }
