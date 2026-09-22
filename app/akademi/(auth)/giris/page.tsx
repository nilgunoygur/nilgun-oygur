import type { Metadata } from "next";
import { AuthPage } from "@/components/akademi/auth-page";
export const metadata: Metadata = { title: "Yeniden merhaba." };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="login" title="Yeniden merhaba." description="Eğitimlerinize devam etmek için hesabınıza giriş yapın." searchParams={searchParams} />;
}
