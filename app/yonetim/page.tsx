import Link from "next/link";
import { ownerPageSession } from "@/lib/auth/page-session";
import { SignOut } from "@/components/akademi/sign-out";
import { buttonVariants } from "@/components/ui/button";
export const metadata = { title: "Yönetim" };
export default async function OwnerPage() {
  await ownerPageSession();
  return <section className="academy-account page-width"><header><div><p className="academy-kicker">AKADEMİ YÖNETİMİ</p><h1>Hoş geldiniz.</h1><p>Yönetim hesabınız güvenle doğrulandı.</p></div><SignOut /></header><div className="flex flex-wrap gap-4"><Link className={buttonVariants({ size: "pill" })} href="/yonetim/egitimler">Eğitimler ve satışlar</Link><Link className={buttonVariants({ size: "pill", variant: "outline" })} href="/akademi/hesabim">Hesabıma dön</Link></div></section>;
}
