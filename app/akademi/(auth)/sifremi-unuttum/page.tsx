import type { Metadata } from "next";
import { AuthPage } from "@/components/akademi/auth-page";
export const metadata: Metadata = { title: "Yeni bir başlangıç." };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="forgot" title="Yeni bir başlangıç." description="E-posta adresinizi yazın. Şifrenizi yenilemeniz için bir bağlantı gönderelim." searchParams={searchParams} />;
}
