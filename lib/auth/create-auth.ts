import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { EmailMessage } from "../email/outbox.ts";
import { checkDistrict, contactFields } from "./profile.ts";
import { matchProvince } from "../turkiye.ts";

const linkLifetime = 3600;

type Dependencies = {
  database: ReturnType<typeof drizzleAdapter>;
  baseURL: string;
  secret: string;
  enqueueEmail: (email: EmailMessage) => Promise<void>;
  /** Runs email rendering and delivery after the response (Next `after`). */
  runInBackground?: (promise: Promise<unknown>) => void;
  revokeUserSessions: (userId: string) => Promise<void>;
  /** Grants Shopier purchases waiting for this verified email. Failures must never block authentication. */
  claimPurchases: (userId: string, email: string) => Promise<void>;
};

export function createAcademyAuth(dependencies: Dependencies) {
  const origin = new URL(dependencies.baseURL);
  if (origin.origin !== dependencies.baseURL || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS origin (HTTP is allowed only for localhost).");
  }
  if (dependencies.secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");

  const sendAuthEmail = async (kind: "verification" | "reset", to: string, url: string) => {
    // Lazy: the renderer is heavy and every lib/auth importer would load it.
    const { authenticationEmail } = await import("../email/templates.tsx");
    await dependencies.enqueueEmail({ ...await authenticationEmail(kind, to, url), expiresAt: new Date(Date.now() + linkLifetime * 1000) });
  };
  const claimSafely = async (userId: string, email: string) => {
    try { await dependencies.claimPurchases(userId, email); } catch { console.error("Akademi purchase claim failed; the next sign-in retries it."); }
  };

  return betterAuth({
    appName: "Nilgün Oygur Akademi",
    baseURL: dependencies.baseURL,
    secret: dependencies.secret,
    database: dependencies.database,
    trustedOrigins: [dependencies.baseURL],
    user: {
      // Required at sign-up, validated on every update. Not returned in sessions: only the profile page and owners read them.
      additionalFields: {
        phone: { type: "string", required: true, returned: false, validator: { input: contactFields.phone } },
        address: { type: "string", required: true, returned: false, validator: { input: contactFields.address } },
        district: { type: "string", required: true, returned: false, validator: { input: contactFields.district } },
        city: { type: "string", required: true, returned: false, validator: { input: contactFields.city } },
        postcode: { type: "string", required: false, returned: false, validator: { input: contactFields.postcode } },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: linkLifetime,
      revokeSessionsOnPasswordReset: true,
      customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
        ...coreFields, twoFactorEnabled: false, ...additionalFields, id,
      }),
      sendResetPassword: ({ user, url }) => sendAuthEmail("reset", user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: linkLifetime,
      afterEmailVerification: async (user) => {
        await claimSafely(user.id, user.email);
      },
      sendVerificationEmail: ({ user, url }) => sendAuthEmail("verification", user.email, url),
    },
    verification: { storeIdentifier: "hashed" },
    session: { cookieCache: { enabled: false } },
    advanced: {
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
      ...(dependencies.runInBackground && { backgroundTasks: { handler: dependencies.runInBackground } }),
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    databaseHooks: {
      user: { update: { after: async (data) => {
        // Better Auth creates a replacement session after changing MFA settings.
        if ("twoFactorEnabled" in data && data.twoFactorEnabled === true) await dependencies.revokeUserSessions(data.id);
      } } },
    },
    hooks: {
      // Field validators see one field at a time; the district must also belong to the province.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email" && ctx.path !== "/update-user") return;
        const body = ctx.body as Record<string, unknown> | undefined;
        if (body?.city === undefined && body?.district === undefined) return;
        const city = matchProvince(typeof body.city === "string" ? body.city : null);
        const checked = city && typeof body.district === "string" ? checkDistrict(city, body.district) : null;
        if (!checked?.district) throw new APIError("BAD_REQUEST", { code: "VALIDATION_ERROR", message: checked?.error ?? "İl ve ilçe birlikte seçilmelidir." });
        return { context: { body: { ...body, district: checked.district } } };
      }),
      after: createAuthMiddleware(async (ctx) => {
        // Purchases made before registration, or with the email before it was verified, arrive on sign-in.
        if (ctx.path === "/sign-in/email" && ctx.context.newSession?.user.emailVerified) {
          await claimSafely(ctx.context.newSession.user.id, ctx.context.newSession.user.email);
        }
      }),
    },
    // nextCookies must stay last so auth calls from Server Functions can set cookies.
    plugins: [twoFactor({ issuer: "Nilgün Oygur Akademi" }), nextCookies()],
  });
}
