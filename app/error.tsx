"use client";
import { Button } from "@/components/ui/button";
import { centeredHero, eyebrow } from "@/lib/styles";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className={centeredHero}>
      <p className={eyebrow}>Bir sorun oluştu</p>
      <h1 className="mb-[22px]">Tekrar deneyelim</h1>
      <p className="mb-6">Sayfa şu anda yüklenemedi. Lütfen yeniden deneyin.</p>
      <Button onClick={reset} size="pill">
        Tekrar Dene
      </Button>
    </section>
  );
}
