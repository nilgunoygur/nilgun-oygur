import type { Metadata } from "next";
import Image from "next/image";
import { pages, asset } from "@/lib/content";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { PhotoCarousel } from "@/components/sliders";
import { SectionHeading } from "@/components/site";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata: Metadata = { title: "Kitaplarım — Bütüncül Şifa" };
export default function Books() {
  const page = pages["/kitaplarim"];
  const stores = page.links.filter((l) =>
    /kitapyurdu|dr.com.tr|idefix/.test(l.href),
  );
  const start = page.text.findIndex((t) => t.text === "Önsöz");
  return (
    <>
      <section className={cn(pageWidth, "grid grid-cols-2 items-center pt-[190px] pb-[110px] tablet:gap-0 max-tablet:grid-cols-1 max-tablet:gap-[35px] max-tablet:pt-[145px] max-tablet:pb-[60px]")}>
        <Reveal className="pl-[120px] max-laptop:pl-[30px] max-tablet:pl-0">
          <h1 className="mb-6 font-sans text-[50px] font-semibold tracking-[-2px] text-foreground max-tablet:text-[42px]">Bütüncül Şifa</h1>
          <p className="text-[25px] leading-[1.45] font-medium max-tablet:text-[23px]">
            Taşların Gizil Gücüyle
            <br /> Şifalanma Sanatı
          </p>
          <div className="mt-[22px] flex flex-wrap gap-[14px] max-tablet:gap-[9px]">
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
        <Reveal className="group relative grid h-[620px] place-items-center overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_50%_58%,#c9dfab_0%,#a0ceae_23%,#4b999c_60%)] perspective-[900px] tablet:mr-8 max-tablet:h-[480px]">
          <div className="relative h-[305px] w-[210px] rounded-[2px_2px_7px_3px] shadow-[1px_3px_0_#eee,2px_6px_0_#fff,7px_15px_12px_#163c4040] transition-transform duration-600 [transform:rotateX(40deg)] group-hover:[transform:rotateX(20deg)_translateY(-5px)] max-tablet:h-[310px] max-tablet:w-[215px]">
            <Image
              src={asset(page.images[1])}
              alt="Bütüncül Şifa — Taşların Gizil Gücüyle Şifalanma Sanatı, Nilgün Oygur"
              fill
              sizes="240px"
              preload
              className="rounded-[inherit]"
            />
          </div>
        </Reveal>
      </section>
      <section className={cn(pageWidth, "pb-[90px] max-tablet:pb-[30px]")}>
        <PhotoCarousel
          book
          label="Kitaptan sayfalar"
          images={page.images.slice(2, 7).map(asset)}
        />
      </section>
      <section className={cn(pageWidth, "max-w-[950px] py-[60px] max-tablet:py-[45px]")}>
        <SectionHeading title="Önsöz" />
        {page.text.slice(start + 1, start + 4).map((p) => (
          <p key={p.text} className="mb-6">{p.text}</p>
        ))}
      </section>
      <section className={cn(pageWidth, "py-[90px] max-tablet:py-[50px]")}>
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
