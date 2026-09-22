import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { centeredHero, eyebrow } from "@/lib/styles";
export default function NotFound() {
  return (
    <section className={centeredHero}>
      <p className={eyebrow}>404</p>
      <h1 className="mb-[22px]">Sayfa bulunamadı</h1>
      <p className="mb-6">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link
        className={buttonVariants({ variant: "secondary", size: "pill" })}
        href="/"
      >
        Anasayfaya Dön
      </Link>
    </section>
  );
}
