import { AuthShell } from "@/components/akademi/auth-shell";
import { MfaForm } from "@/components/akademi/mfa-form";
import { ownerEnrollmentSession } from "@/lib/auth/page-session";
export const metadata = { title: "Yönetim güvenliği" };
export default async function SecurityPage() {
  const session = await ownerEnrollmentSession();
  return <AuthShell title="Güvenli bir adım daha." description="Yönetim alanına erişmek için doğrulayıcı uygulamanızı kullanın."><MfaForm enabled={session.user.twoFactorEnabled === true} /></AuthShell>;
}
