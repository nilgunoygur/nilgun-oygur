import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { SectionHeading, Journey, BlogSection } from "@/components/site";
import { courses } from "@/lib/content";
import { centeredHero, eyebrow, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata: Metadata = { title: "Eğitimlerim" };
export default function Trainings() {
  return (
    <>
      <Reveal className={centeredHero}>
        <p className={eyebrow}>Kendini Keşfet</p>
        <h1 className="mb-[22px]">
          Potansiyelini
          <br /> Açığa Çıkar
        </h1>
      </Reveal>
      <section className={cn(pageWidth, "pt-5 pb-[110px] max-tablet:pb-[70px]")}>
        <SectionHeading eyebrow="Temel Konular" title="Eğitimlerim" />
        <div className="m-auto grid max-w-[810px] grid-cols-2 gap-x-[22px] gap-y-8 max-tablet:max-w-[430px] max-tablet:grid-cols-1 max-tablet:gap-[25px]">
          {courses.map((c) => (
            <Reveal key={c.slug}>
              <Link href={c.href} className="group block rounded-[18px] border border-[#f5f5f5] px-[9px] pt-[9px] pb-6 shadow-[0_2px_30px_#00000005]">
                <div className="relative h-[300px] overflow-hidden rounded-[12px]">
                  <Image
                    src={c.cardImage}
                    alt={c.title}
                    fill
                    sizes="(max-width:760px) 90vw, 380px"
                    className="transition-transform duration-500 group-hover:scale-[1.035]"
                  />
                </div>
                <h3 className="mx-[15px] mt-[22px] mb-3">{c.title}</h3>
                <p className="mx-[15px] text-[16px]">{c.description}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <Journey />
      <BlogSection />
    </>
  );
}
