import { Suspense } from "react";
import { config } from "@/lib/config";
import { AuthShell } from "./auth-shell";
import { AuthForm, type AuthMode } from "./auth-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Auth screens: the shell prerenders; the form streams in once the link's query (token, next, status) is known. */
export function AuthPage({ mode, title, description, searchParams }: { mode: AuthMode; title: string; description: string; searchParams: SearchParams }) {
  const settings = config();
  const configured = settings.enabled.auth;
  return <AuthShell title={title} description={description}>
    <Suspense fallback={<AuthForm mode={mode} configured={configured} localEmail={settings.consoleEmail} />}>
      <FormWithParams mode={mode} configured={configured} localEmail={settings.consoleEmail} searchParams={searchParams} />
    </Suspense>
  </AuthShell>;
}

async function FormWithParams({ mode, configured, localEmail, searchParams }: { mode: AuthMode; configured: boolean; localEmail: boolean; searchParams: SearchParams }) {
  const params = await searchParams;
  const message = params.error ? "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin."
    : params.verified === "1" ? "E-posta doğrulama işleminiz tamamlandı. Şimdi giriş yapabilirsiniz."
    : params.reset === "1" ? "Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz." : undefined;
  return <AuthForm mode={mode} configured={configured} localEmail={localEmail} token={typeof params.token === "string" ? params.token : undefined} destination={typeof params.next === "string" ? params.next : undefined} initialMessage={message} />;
}
