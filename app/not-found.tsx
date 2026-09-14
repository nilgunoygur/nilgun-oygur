import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="centered-hero">
      <p className="eyebrow">404</p>
      <h1>Sayfa bulunamadı</h1>
      <p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link
        className={buttonVariants({ variant: "secondary", size: "pill" })}
        href="/"
      >
        Anasayfaya Dön
      </Link>
    </section>
  );
}
