import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";

export function AuthShell({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section className="academy-auth page-width">
      <aside className="academy-auth-story">
        <span className="academy-wordmark"><Leaf aria-hidden="true" /> Nilgün Oygur Akademi</span>
        <div>
          <p className="academy-kicker">KENDİNİZE AYIRDIĞINIZ ZAMAN</p>
          <h2>Yolculuğunuz,<br /><em>kaldığınız yerden.</em></h2>
          <p>Öğrenmek, keşfetmek ve kendinize alan açmak için kişisel eğitim alanınız.</p>
        </div>
        <Link href="/akademi">Eğitimleri keşfedin <ArrowUpRight aria-hidden="true" /></Link>
      </aside>
      <div className="academy-auth-panel">
        <header><p className="academy-kicker">AKADEMİ HESABINIZ</p><h1>{title}</h1><p>{description}</p></header>
        {children}
      </div>
    </section>
  );
}
