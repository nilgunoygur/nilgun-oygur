import Link from "next/link";
import { ownerPageSession } from "@/lib/auth/page-session";
import { SignOut } from "@/components/akademi/sign-out";
import { buttonVariants } from "@/components/ui/button";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata = { title: "Yönetim" };
export default async function OwnerPage() {
  await ownerPageSession();
  return <section className={cn(pageWidth, accountPage)}><header className={accountHeader}><div><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Hoş geldiniz.</h1><p>Yönetim hesabınız güvenle doğrulandı.</p></div><SignOut /></header><div className="flex flex-wrap gap-4"><Link className={buttonVariants({ size: "pill" })} href="/yonetim/egitimler">Eğitimler ve satışlar</Link><Link className={buttonVariants({ size: "pill", variant: "outline" })} href="/akademi/hesabim">Hesabıma dön</Link></div></section>;
}
