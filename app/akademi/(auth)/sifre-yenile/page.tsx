import type { Metadata } from "next";
import { AuthPage } from "@/components/akademi/auth-page";
export const metadata: Metadata = { title: "Yeni şifrenizi seçin." };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="reset" title="Yeni şifrenizi seçin." description="Hesabınıza güvenle dönmek için yeni bir şifre belirleyin." searchParams={searchParams} />;
}
