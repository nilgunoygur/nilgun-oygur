import type { Metadata } from "next";
import { AuthPage } from "@/components/akademi/auth-page";
export const metadata: Metadata = { title: "Gelen kutunuza bakın." };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="verify" title="Gelen kutunuza bakın." description="Doğrulama bağlantınız ulaşmadıysa yeniden isteyebilirsiniz." searchParams={searchParams} />;
}
