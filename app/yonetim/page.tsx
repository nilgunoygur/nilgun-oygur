import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ownerEnrollmentSession } from "@/lib/auth/page-session";
import { getDatabase } from "@/lib/db";
import { ownerMfaSessions } from "@/lib/db/schema";
import { hasOwnerAuthorization } from "@/lib/auth/owner-policy";
import { SignOut } from "@/components/akademi/sign-out";
import { Alert, AlertDescription } from "@/components/ui/alert";
export const metadata = { title: "Yönetim" };
export default async function OwnerPage() {
  const session = await ownerEnrollmentSession();
  const [proof] = await getDatabase().select().from(ownerMfaSessions).where(eq(ownerMfaSessions.sessionId, session.session.id)).limit(1);
  if (!hasOwnerAuthorization({ hasSession: true, emailVerified: session.user.emailVerified, isOwner: true, twoFactorEnabled: session.user.twoFactorEnabled === true, sessionMfaVerified: !!proof })) redirect("/yonetim/guvenlik");
  return <section className="academy-account page-width"><header><div><p className="academy-kicker">AKADEMİ YÖNETİMİ</p><h1>Hoş geldiniz.</h1><p>Yönetim hesabınız güvenle doğrulandı.</p></div><SignOut /></header><Alert><AlertDescription>Eğitim, öğrenci ve sipariş yönetimi henüz kullanıma açılmadı.</AlertDescription></Alert><Link className="mt-8 inline-block underline" href="/akademi/hesabim">Hesabıma dön</Link></section>;
}
