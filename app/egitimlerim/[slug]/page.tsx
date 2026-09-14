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
      <section className="curriculum-section">
        <SectionHeading
          eyebrow={c.title.replace(" Eğitimi", "")}
          title="Eğitim Programı"
        />
        <div className="curriculum">
          {c.program.map((p, i) => (
            <Reveal key={i} className="curriculum-item">
              <Atom strokeWidth={1} />
              <div>
                <h3>{p.title}</h3>
                {p.lines.length > 0 && (
                  <ul>
                    {p.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
          <Booking label="Görüşme Ayarlayın" credit={false} />
        </div>
      </section>
      {c.gallery.length > 0 && (
        <div className="course-gallery page-width">
          <PhotoCarousel images={c.gallery} />
        </div>
      )}
      <Journey gallery={false} />
      <BlogSection />
    </>
  );
}
