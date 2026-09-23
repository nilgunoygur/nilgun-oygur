import "server-only";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "@/lib/config";
import { getDatabase } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getEmailOutbox } from "@/lib/email";
import { claimPurchasesByEmail } from "@/lib/akademi/course-access";
import { createAcademyAuth } from "./create-auth";
import { revokeUserSessions } from "./owner-access";

let auth: ReturnType<typeof createAcademyAuth> | undefined;
export function getAuth() {
  if (auth) return auth;
  const { enabled, auth: settings } = config();
  if (!enabled.auth) throw new Error("Akademi authentication is not configured.");
  const db = getDatabase();
  auth = createAcademyAuth({
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    baseURL: settings.url!,
    secret: settings.secret!,
    enqueueEmail: getEmailOutbox().enqueue,
    revokeUserSessions: userId => revokeUserSessions(db, userId),
    claimPurchases: async (userId, email) => { await claimPurchasesByEmail(db, userId, email); },
  });
  return auth;
}
