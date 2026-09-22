import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Atom } from "lucide-react";
import { courses } from "@/lib/content";
import {
  Hero,
  SectionHeading,
  Booking,
  Journey,
  BlogSection,
} from "@/components/site";
import { Reveal } from "@/components/reveal";
import { PhotoCarousel } from "@/components/sliders";
import { pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = courses.find((c) => c.slug === slug);
  return { title: c?.title, description: c?.description };
}
export default async function Course({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = courses.find((c) => c.slug === slug);
  if (!c) notFound();
  return (
    <>
      <Hero
        eyebrow="Mucizevi değişimlerin kapısını aralayın"
        title={c.title}
        description={c.intro}
        image={c.image}
      />
      <section className="rounded-[80%_0_0_0/5%_0_0_0] bg-muted px-[25px] py-[100px] max-tablet:py-[75px]">
        <SectionHeading
          eyebrow={c.title.replace(" Eğitimi", "")}
          title="Eğitim Programı"
        />
        <div className="m-auto max-w-[640px]">
          {c.program.map((p, i) => (
            <Reveal key={i} className="relative flex gap-8 pb-[46px] not-last:before:absolute not-last:before:top-[66px] not-last:before:bottom-4 not-last:before:left-6 not-last:before:w-[3px] not-last:before:bg-accent not-last:before:content-[''] max-tablet:gap-5 max-tablet:before:hidden">
              <Atom strokeWidth={1} className="size-[50px] shrink-0 text-primary max-tablet:size-9" />
              <div>
                <h3>{p.title}</h3>
                {p.lines.length > 0 && (
                  <ul className="mt-3 pl-5 text-[16px] leading-[1.7] text-muted-foreground">
                    {p.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
          <Booking label="Görüşme Ayarlayın" credit={false} className="mx-auto mt-[25px] mb-0" />
        </div>
      </section>
      {c.gallery.length > 0 && (
        <div className={cn(pageWidth, "py-[100px] max-tablet:py-[60px]")}>
          <PhotoCarousel images={c.gallery} />
        </div>
      )}
      <Journey gallery={false} />
      <BlogSection />
    </>
  );
}
