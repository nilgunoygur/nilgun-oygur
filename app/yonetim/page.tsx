import { Suspense } from "react";
import Link from "next/link";
import { ownerPage } from "@/lib/auth/viewer";
import { SignOut } from "@/components/akademi/sign-out";
import { buttonVariants } from "@/components/ui/button";
import { accountHeader, accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata = { title: "Yönetim" };
export default function OwnerPage() {
  return <section className={cn(pageWidth, accountPage)}><Suspense fallback={null}><OwnerHome /></Suspense></section>;
}
async function OwnerHome() {
  await ownerPage();
  return <><header className={accountHeader}><div><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Hoş geldiniz.</h1><p>Yönetim hesabınız güvenle doğrulandı.</p></div><SignOut /></header><div className="flex flex-wrap gap-4"><Link className={buttonVariants({ size: "pill" })} href="/yonetim/egitimler">Eğitimler ve satışlar</Link><Link className={buttonVariants({ size: "pill", variant: "outline" })} href="/akademi/hesabim">Hesabıma dön</Link></div></>;
}
