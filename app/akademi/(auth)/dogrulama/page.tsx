import type { Metadata } from "next";
import { AuthShell } from "@/components/akademi/auth-shell";
import { AuthForm } from "@/components/akademi/auth-form";
import { isAuthConfigured } from "@/lib/auth";
export const metadata: Metadata = { title: "Gelen kutunuza bakın." };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const message = params.error ? "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin."
    : params.verified === "1" ? "E-posta doğrulama işleminiz tamamlandı. Şimdi giriş yapabilirsiniz."
    : params.reset === "1" ? "Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz." : undefined;
  return <AuthShell title="Gelen kutunuza bakın." description="Doğrulama bağlantınız ulaşmadıysa yeniden isteyebilirsiniz."><AuthForm mode="verify" configured={isAuthConfigured()} token={typeof params.token === "string" ? params.token : undefined} destination={typeof params.next === "string" ? params.next : undefined} initialMessage={message} /></AuthShell>;
}
