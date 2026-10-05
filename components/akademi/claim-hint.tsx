import Link from "next/link";
import { claimHintCookie } from "@/lib/akademi/claim-schema";
import { buttonVariants } from "@/components/ui/button";
import { Dismissible } from "./dismissible";

export function ClaimHint() {
  return <Dismissible cookie={claimHintCookie} days={365} className="mb-8 flex flex-wrap items-center gap-4 rounded-[20px] bg-mist p-6">
    <p className="mr-auto">Satın aldığınız eğitim görünmüyor mu?</p>
    <Link href="/akademi/siparis-ekle" className={buttonVariants({ variant: "outline" })}>Shopier siparişimi ekle</Link>
    <Link href="/akademi/egitim-ekleme" className="text-sm text-forest underline underline-offset-4">Nasıl eklenir?</Link>
  </Dismissible>;
}
