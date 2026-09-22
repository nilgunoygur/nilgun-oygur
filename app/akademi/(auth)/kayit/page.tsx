import type { Metadata } from "next";
import { AuthPage } from "@/components/akademi/auth-page";
export const metadata: Metadata = { title: "İlk adımı atın." };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="register" title="İlk adımı atın." description="Hesabınızı oluşturun, öğrenme yolculuğunuz için yerinizi hazırlayın." searchParams={searchParams} />;
}
