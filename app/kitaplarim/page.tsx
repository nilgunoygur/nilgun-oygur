import type { Metadata } from "next";
import Image from "next/image";
import { pages, asset } from "@/lib/content";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { PhotoCarousel } from "@/components/sliders";
import { SectionHeading } from "@/components/site";
export const metadata: Metadata = { title: "Kitaplarım — Bütüncül Şifa" };
export default function Books() {
  const page = pages["/kitaplarim"];
  const stores = page.links.filter((l) =>
    /kitapyurdu|dr.com.tr|idefix/.test(l.href),
  );
  const start = page.text.findIndex((t) => t.text === "Önsöz");
  return (
    <>
      <section className="book-hero page-width">
        <Reveal className="book-copy">
          <h1>Bütüncül Şifa</h1>
          <p>
            Taşların Gizil Gücüyle
            <br /> Şifalanma Sanatı
          </p>
          <div className="book-stores">
            {stores.map((s, i) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "secondary",
                  size: "pill",
                })}
              >
                {["Kitap Yurdu'na Git", "D&R'a Git", "İdefix'e Git"][i]}
              </a>
            ))}
          </div>
        </Reveal>
        <Reveal className="book-art">
          <div className="book-object">
            <Image
              src={asset(page.images[1])}
              alt="Bütüncül Şifa — Taşların Gizil Gücüyle Şifalanma Sanatı, Nilgün Oygur"
              fill
              sizes="240px"
              preload
            />
          </div>
        </Reveal>
      </section>
      <section className="book-preview page-width">
        <PhotoCarousel
          label="Kitaptan sayfalar"
          images={page.images.slice(2, 7).map(asset)}
        />
      </section>
      <section className="book-preface page-width">
        <SectionHeading title="Önsöz" />
        {page.text.slice(start + 1, start + 4).map((p) => (
          <p key={p.text}>{p.text}</p>
        ))}
      </section>
      <section className="book-reviews page-width">
        <SectionHeading title="Sizden Gelenler" />
        <PhotoCarousel
          label="Okuyuculardan gelenler"
          images={page.images
            .slice(7)
            .filter((x) => !x.endsWith(".svg") && !x.endsWith(".png"))
            .map(asset)}
        />
      </section>
    </>
  );
}
