import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function AuthShell({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section className={cn(pageWidth, "grid grid-cols-2 items-start gap-[90px] pt-[150px] pb-[90px] max-[901px]:gap-[38px] max-[681px]:grid-cols-1 max-[681px]:gap-7 max-[681px]:pt-[116px] max-[681px]:pb-[60px]")}>
      <aside className="flex min-h-[650px] flex-col justify-between gap-[60px] rounded-[28px] bg-accent p-11 max-[901px]:p-[30px] max-[681px]:min-h-0 max-[681px]:gap-6 max-[681px]:p-6">
        <span className="flex items-center gap-[10px] text-[17px] font-medium"><Leaf aria-hidden="true" className="text-primary" /> Nilgün Oygur Akademi</span>
        <div className="max-[681px]:hidden">
          <p className={kicker}>KENDİNİZE AYIRDIĞINIZ ZAMAN</p>
          <h2 className="mb-[26px] font-display text-[clamp(32px,3.5vw,48px)] leading-[1.2] font-normal tracking-[-1.4px]">Yolculuğunuz,<br /><em className="text-primary not-italic">kaldığınız yerden.</em></h2>
          <p className="max-w-[340px] text-[17px] text-foreground">Öğrenmek, keşfetmek ve kendinize alan açmak için kişisel eğitim alanınız.</p>
        </div>
        <Link href="/akademi" className="flex w-fit items-center gap-[14px] text-[14px] max-[681px]:hidden">Eğitimleri keşfedin <ArrowUpRight aria-hidden="true" /></Link>
      </aside>
      <div className="w-full max-w-[420px] py-7 max-[681px]:max-w-none max-[681px]:p-0">
        <header className="mb-[34px]"><p className={kicker}>AKADEMİ HESABINIZ</p><h1 className="mb-4 text-[40px] max-[681px]:text-[36px]">{title}</h1><p className="text-[16px] text-foreground">{description}</p></header>
        {children}
      </div>
    </section>
  );
}
