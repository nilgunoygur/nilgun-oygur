"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="centered-hero">
      <p className="eyebrow">Bir sorun oluştu</p>
      <h1>Tekrar deneyelim</h1>
      <p>Sayfa şu anda yüklenemedi. Lütfen yeniden deneyin.</p>
      <Button onClick={reset} size="pill">
        Tekrar Dene
      </Button>
    </section>
  );
}
