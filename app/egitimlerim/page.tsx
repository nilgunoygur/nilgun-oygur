import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { SectionHeading, Journey, BlogSection } from "@/components/site";
import { courses } from "@/lib/content";
export const metadata: Metadata = { title: "Eğitimlerim" };
export default function Trainings() {
  return (
    <>
      <Reveal className="centered-hero">
        <p className="eyebrow">Kendini Keşfet</p>
        <h1>
          Potansiyelini
          <br /> Açığa Çıkar
        </h1>
      </Reveal>
      <section className="training-catalog page-width">
        <SectionHeading eyebrow="Temel Konular" title="Eğitimlerim" />
        <div className="course-grid">
          {courses.map((c) => (
            <Reveal key={c.slug}>
              <Link href={c.href} className="course-card">
                <div className="course-image">
                  <Image
                    src={c.cardImage}
                    alt={c.title}
                    fill
                    sizes="(max-width:760px) 90vw, 380px"
                  />
                </div>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
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
