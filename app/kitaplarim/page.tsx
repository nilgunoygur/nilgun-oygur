import { pageMetadata } from "@/lib/seo";
import { pages, asset } from "@/lib/content";
import { buttonVariants } from "@/components/ui/button";
import { Book3D, SpineText } from "@/components/book-3d";
import { Reveal } from "@/components/reveal";
import { PhotoCarousel } from "@/components/sliders";
import { SectionHeading } from "@/components/site";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata = pageMetadata("Kitaplarım — Bütüncül Şifa", "Nilgün Oygur’un Bütüncül Şifa kitaplarını keşfedin. Kitap içeriklerini inceleyin ve kişisel gelişim yolculuğunuz için yeni kaynaklar bulun.", "/kitaplarim");
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
        <Reveal className="grid h-[620px] place-items-center overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_50%_58%,#c9dfab_0%,#a0ceae_23%,#4b999c_60%)] tablet:mr-8 max-tablet:h-[520px]">
          <Book3D
            front={asset(page.images[1])}
            alt="Bütüncül Şifa — Taşların Gizil Gücüyle Şifalanma Sanatı, Nilgün Oygur"
            spine={<SpineText
              start={<span className="text-[calc(var(--t)*0.42)] text-[#3b4a57]">Nilgün Oygur</span>}
              title={<span className="font-display text-[calc(var(--t)*0.54)] tracking-[0.12em] text-[#2b6cb3]">BÜTÜNCÜL ŞİFA</span>}
              end={<span className="text-[calc(var(--t)*0.4)] font-semibold text-[#3b4a57]">satori</span>}
            />}
          >
            {/* Typeset from the book's own blurb until the publisher's back-cover artwork is on the site. */}
            <div className="flex size-full flex-col px-[9%] pt-[11%] pb-[7%] text-left text-[#3b4a57]">
              <span aria-hidden className="mb-[9%] aspect-square w-[19%] rounded-full border-[calc(var(--h)*0.009)] border-[#2b6cb3]" />
              <p className="text-[calc(var(--h)*0.0275)] leading-[1.6]">{page.text[start + 1].text}</p>
              <p className="mt-auto font-display text-[calc(var(--h)*0.045)] text-[#2b6cb3]">Nilgün Oygur</p>
              <p className="mt-[3%] flex justify-between text-[calc(var(--h)*0.021)]"><span className="font-semibold">satori</span><span>ISBN 9786057098313</span></p>
            </div>
          </Book3D>
        </Reveal>
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
