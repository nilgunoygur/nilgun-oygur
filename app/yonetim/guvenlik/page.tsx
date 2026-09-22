import { Suspense } from "react";
import { AuthShell } from "@/components/akademi/auth-shell";
import { MfaForm } from "@/components/akademi/mfa-form";
import { ownerEnrollmentPage } from "@/lib/auth/viewer";
export const metadata = { title: "Yönetim güvenliği" };
export default function SecurityPage() {
  return <AuthShell title="Güvenli bir adım daha." description="Yönetim alanına erişmek için doğrulayıcı uygulamanızı kullanın."><Suspense fallback={null}><Enrollment /></Suspense></AuthShell>;
}
async function Enrollment() {
  const viewer = await ownerEnrollmentPage();
  return <MfaForm enabled={viewer.user.twoFactorEnabled === true} />;
}
