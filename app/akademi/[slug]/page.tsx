import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { formatAccess, getCatalogCourse } from "@/lib/akademi/catalog";
import { CoursePrice } from "@/components/akademi/course-price";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 600;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const course = await getCatalogCourse((await params).slug);
  return { title: course?.title, description: course?.description, robots: { index: !!course, follow: true }, alternates: course ? { canonical: `/akademi/${course.slug}` } : undefined };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCatalogCourse((await params).slug);
  if (!course) notFound();
  return <div className="academy-detail page-width">
    <Link href="/akademi#egitimler" className="academy-text-link"><ArrowLeft size={16} /> Tüm eğitimler</Link>
    <div className="academy-detail-grid">
      <div>
        <p className="academy-kicker">NİLGÜN OYGUR AKADEMİ</p>
        <h1>{course.title}</h1><p className="academy-detail-intro">{course.description}</p>
        <div className="academy-detail-image"><Image src={course.image} alt={course.title} fill sizes="(max-width:760px) 90vw, 760px" priority /></div>
      </div>
      <aside className="academy-purchase-card">
        <p className="academy-kicker">KENDİNİZE BİR ALAN AÇIN</p>
        <h2>Yolculuğunuz burada başlasın.</h2>
        <CoursePrice className="academy-detail-price" priceKurus={course.priceKurus} compareAtPriceKurus={course.compareAtPriceKurus} />
        <ul>{[formatAccess(course.accessDurationDays), "Kendi ritminizde öğrenme", "Kişisel eğitim alanı"].map(x => <li key={x}><Check size={17} aria-hidden="true" />{x}</li>)}</ul>
        <Link className={buttonVariants({ size: "hero", className: "academy-buy-button" })} href={`/akademi/${course.slug}/satin-al`}>Satın al <ArrowUpRight size={18} /></Link>
        <Link href="/akademi/giris" className="academy-text-link">Zaten hesabınız var mı? Giriş yapın</Link>
      </aside>
    </div>
  </div>;
}
