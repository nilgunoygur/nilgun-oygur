import "server-only";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getEmailOutbox, isConsoleEmail } from "@/lib/email";
import { createAcademyAuth } from "./create-auth";

let auth: ReturnType<typeof createAcademyAuth> | undefined;
export function isAuthConfigured() {
  const required = ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "EMAIL_ENCRYPTION_KEY"];
  if (!isConsoleEmail()) required.push("RESEND_API_KEY", "RESEND_FROM", "RESEND_REPLY_TO");
  return required.every(key => !!process.env[key]);
}
export function getAuth() {
  if (auth) return auth;
  if (!isAuthConfigured()) throw new Error("Akademi authentication is not configured.");
  const db = getDatabase();
  auth = createAcademyAuth({
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    enqueueEmail: getEmailOutbox().enqueue,
    markMfaSession: async (sessionId) => {
      await db.insert(schema.ownerMfaSessions).values({ sessionId }).onConflictDoNothing();
    },
    revokeUserSessions: async (userId) => {
      await db.delete(schema.session).where(eq(schema.session.userId, userId));
    },
  });
  return auth;
}
