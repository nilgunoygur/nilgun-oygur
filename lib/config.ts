// The only place that reads Akademi environment variables. Missing values switch features off rather
// than failing, so public pages still build without academy credentials.
type Env = Record<string, string | undefined>;

const value = (env: Env, key: string) => env[key]?.trim() || undefined;

export function parseConfig(env: Env) {
  const databaseUrl = value(env, "DATABASE_URL");
  const shopierToken = value(env, "SHOPIER_API_TOKEN");
  const webhookTokens = (value(env, "SHOPIER_WEBHOOK_TOKEN") ?? "").split(",").map(token => token.trim()).filter(Boolean);
  const resend = { apiKey: value(env, "RESEND_API_KEY"), from: value(env, "RESEND_FROM"), replyTo: value(env, "RESEND_REPLY_TO") };
  const auth = { url: value(env, "BETTER_AUTH_URL"), secret: value(env, "BETTER_AUTH_SECRET"), emailKey: value(env, "EMAIL_ENCRYPTION_KEY") };
  // Dev only: auth emails are printed to the terminal when Resend is not configured.
  const consoleEmail = env.NODE_ENV === "development" && !resend.apiKey;
  const resendReady = !!(resend.apiKey && resend.from && resend.replyTo);
  return {
    databaseUrl,
    shopier: {
      token: shopierToken,
      webhookTokens,
      /** Development and Preview only: treat hidden [TEST] products as courses. */
      includeHidden: value(env, "SHOPIER_SHOW_HIDDEN_PRODUCTS") === "true",
    },
    auth,
    resend,
    consoleEmail,
    cronSecret: value(env, "CRON_SECRET"),
    siteUrl: value(env, "NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
    /** Which Akademi features have everything they need. */
    enabled: {
      catalog: !!databaseUrl && !!shopierToken,
      webhooks: !!databaseUrl && webhookTokens.length > 0,
      email: !!databaseUrl && !!auth.emailKey && (consoleEmail || resendReady),
      auth: !!databaseUrl && !!auth.url && !!auth.secret && !!auth.emailKey && (consoleEmail || resendReady),
    },
  };
}

export type Config = ReturnType<typeof parseConfig>;

let cached: Config | undefined;
export function config(): Config {
  return cached ??= parseConfig(process.env);
}
