"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PhotoCarousel({
  images,
  label = "Etkinlik fotoğrafları",
}: {
  images: string[];
  label?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  return (
    <div
      className="photo-carousel"
      aria-roledescription="slayt gösterisi"
      aria-label={label}
    >
      <div className="gallery-window">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduced ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className="gallery-photo"
            style={{ position: "absolute", inset: 0 }}
          >
            <Image
              src={images[index]}
              alt={`${label} — ${index + 1}. fotoğraf`}
              fill
              sizes="(max-width: 760px) 90vw, 65vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="carousel-controls">
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Önceki fotoğraf"
          onClick={() => setIndex((index - 1 + images.length) % images.length)}
        >
          <ArrowLeft />
        </Button>
        <span aria-live="polite">
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
export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={article.href} className="article-card">
      <div className="article-image">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 760px) 90vw, 33vw"
        />
      </div>
      <p className="article-category">{article.category}</p>
      <h3>{article.title}</h3>
      <div className="article-meta">
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
    <div className="article-carousel">
      <div className="article-track" ref={ref}>
        {articles.map((a) => (
          <ArticleCard key={a.href} article={a} />
        ))}
      </div>
      <div className="carousel-controls">
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
      <span className="copy-status" role="status">
        {status}
      </span>
    </>
  );
}

export function GalleryStrip({ images }: { images: string[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="journey-gallery">
      <div className="gallery-strip" data-paused={paused}>
        <div className="gallery-strip-track">
          {[0, 1].map((copy) => (
            <div
              className="gallery-strip-group"
              key={copy}
              aria-hidden={copy === 1}
            >
              {images.map((src, i) => (
                <div className="gallery-strip-photo" key={src}>
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
      >
        {paused ? <Play /> : <Pause />}
        {paused ? "Fotoğrafları oynat" : "Fotoğrafları duraklat"}
      </Button>
    </div>
  );
}
