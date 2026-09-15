import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";

export type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  expiresAt: Date;
};

type Dependencies = {
  database: ReturnType<typeof drizzleAdapter>;
  baseURL: string;
  secret: string;
  enqueueEmail: (email: AuthEmail) => Promise<void>;
  markMfaSession: (sessionId: string) => Promise<void>;
  revokeUserSessions: (userId: string) => Promise<void>;
};

export function createAcademyAuth(dependencies: Dependencies) {
  const origin = new URL(dependencies.baseURL);
  if (origin.origin !== dependencies.baseURL || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS origin (HTTP is allowed only for localhost).");
  }
  if (dependencies.secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");

  return betterAuth({
    appName: "Nilgün Oygur Akademi",
    baseURL: dependencies.baseURL,
    secret: dependencies.secret,
    database: dependencies.database,
    trustedOrigins: [dependencies.baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
        ...coreFields, twoFactorEnabled: false, ...additionalFields, id,
      }),
      sendResetPassword: async ({ user, url }) => {
        await dependencies.enqueueEmail({
          to: user.email,
          subject: "Akademi şifrenizi yenileyin",
          text: `Şifrenizi yenilemek için aşağıdaki bağlantıyı açın. Bağlantı bir saat geçerlidir.\n\n${url}\n\nBu isteği siz yapmadıysanız bu e-postayı dikkate almayın.`,
          expiresAt: new Date(Date.now() + 3600_000),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => {
        await dependencies.enqueueEmail({
          to: user.email,
          subject: "Akademi e-posta adresinizi doğrulayın",
          text: `E-posta adresinizi doğrulamak için aşağıdaki bağlantıyı açın. Bağlantı bir saat geçerlidir.\n\n${url}`,
          expiresAt: new Date(Date.now() + 3600_000),
        });
      },
    },
    verification: { storeIdentifier: "hashed" },
    session: { cookieCache: { enabled: false } },
    advanced: { ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] } },
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
      after: createAuthMiddleware(async (ctx) => {
        if (!["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(ctx.path)) return;
        const result = ctx.context.returned;
        if (!result || typeof result !== "object" || !("token" in result) || typeof result.token !== "string") return;
        const verified = ctx.context.newSession ?? ctx.context.session;
        if (verified) await dependencies.markMfaSession(verified.session.id);
      }),
    },
    plugins: [twoFactor({ issuer: "Nilgün Oygur Akademi" })],
  });
}
