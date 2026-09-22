"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { articleMeta } from "@/lib/styles";

const controls = "mt-6 flex items-center justify-center gap-4 [&_button]:rounded-full";
export function PhotoCarousel({
  images,
  label = "Etkinlik fotoğrafları",
  book = false,
}: {
  images: string[];
  label?: string;
  /** Book preview: taller pages on a muted background. */
  book?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  return (
    <div
      className="m-auto max-w-[850px]"
      aria-roledescription="slayt gösterisi"
      aria-label={label}
    >
      <div className={cn("relative h-[470px] overflow-hidden rounded-[22px] bg-[#ffffff70] max-tablet:h-[350px]", book && "bg-muted")}>
        <AnimatePresence initial={false}>
          <m.div
            key={index}
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduced ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className={cn("relative", book ? "h-[620px] max-tablet:h-[430px]" : "h-[470px] max-tablet:h-80")}
            style={{ position: "absolute", inset: 0 }}
          >
            <Image
              src={images[index]}
              alt={`${label} — ${index + 1}. fotoğraf`}
              fill
              sizes="(max-width: 760px) 90vw, 65vw"
              className="object-contain"
            />
          </m.div>
        </AnimatePresence>
      </div>
      <div className={controls}>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Önceki fotoğraf"
          onClick={() => setIndex((index - 1 + images.length) % images.length)}
        >
          <ArrowLeft />
        </Button>
        <span aria-live="polite" className="text-[13px] text-muted-foreground">
          {index + 1} / {images.length}
        </span>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Sonraki fotoğraf"
          onClick={() => setIndex((index + 1) % images.length)}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
type Article = {
  href: string;
  title: string;
  image: string;
  category: string;
  date: string;
  duration: string;
};
export function ArticleCard({ article, className, card = false }: { article: Article; className?: string; card?: boolean }) {
  const inset = card && "mx-[15px]";
  return (
    <Link href={article.href} className={cn("group block min-w-0", card && "rounded-[16px] bg-white px-[9px] pt-[9px] pb-6", className)}>
      <div className="relative mb-[22px] h-[260px] overflow-hidden rounded-[18px] max-tablet:h-[240px]">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 760px) 90vw, 33vw"
          className="transition-transform duration-500 group-hover:scale-[1.035]"
        />
      </div>
      <p className={cn("mb-3 text-[14px] text-primary", inset)}>{article.category}</p>
      <h3 className={cn("text-[24px] leading-[1.35]", inset)}>{article.title}</h3>
      <div className={cn(articleMeta, "mt-5", inset)}>
        <span>{article.date}</span>
        <span>{article.duration}</span>
      </div>
    </Link>
  );
}
export function ArticleCarousel({ articles }: { articles: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scroll = (direction: number) =>
    ref.current?.scrollBy({
      left: direction * (ref.current.clientWidth + 24),
      behavior: reduced ? "instant" : "smooth",
    });
  return (
    <div className="min-w-0 overflow-hidden">
      <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={ref}>
        {articles.map((a) => (
          <ArticleCard key={a.href} article={a} className="shrink-0 grow-0 basis-[calc((100%-48px)/3)] snap-start max-tablet:basis-[88%]" />
        ))}
      </div>
      <div className={controls}>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Önceki yazılar"
          onClick={() => scroll(-1)}
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Sonraki yazılar"
          onClick={() => scroll(1)}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
export function CopyLink() {
  const [status, setStatus] = useState("");
  return (
    <>
      <Button
        variant="secondary"
        size="pill"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setStatus("Bağlantı kopyalandı");
          } catch {
            setStatus("Bağlantıyı adres çubuğundan kopyalayabilirsiniz.");
          }
        }}
      >
        {status === "Bağlantı kopyalandı" ? <Check /> : <Copy />} Copy Link
      </Button>
      <span className="mt-[10px] mb-6 block min-h-5 text-[13px] text-primary" role="status">
        {status}
      </span>
    </>
  );
}

export function GalleryStrip({ images }: { images: string[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="text-center">
      <div className="group ml-[calc(50%-50vw)] w-screen overflow-hidden py-10 motion-reduce:overflow-x-auto" data-paused={paused}>
        <div className="flex w-max animate-gallery-drift group-focus-within:[animation-play-state:paused] group-data-[paused=true]:[animation-play-state:paused] pointer-fine:group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div
              className={cn("flex gap-4 pr-4", copy === 1 && "motion-reduce:hidden")}
              key={copy}
              aria-hidden={copy === 1}
            >
              {images.map((src, i) => (
                <div className="relative h-[400px] w-[300px] overflow-hidden rounded-[16px] even:-translate-y-[30px] max-tablet:h-80 max-tablet:w-[240px]" key={src}>
                  <Image
                    src={src}
                    alt={copy ? "" : `Etkinliklerimizden ${i + 1}. fotoğraf`}
                    fill
                    sizes="300px"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        size="pill"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        className="motion-reduce:hidden"
      >
        {paused ? <Play /> : <Pause />}
        {paused ? "Fotoğrafları oynat" : "Fotoğrafları duraklat"}
      </Button>
    </div>
  );
}
