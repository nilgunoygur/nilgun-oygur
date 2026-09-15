import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Play } from "lucide-react";
import { demoCourses, demoCourseImage, demoPrice } from "@/lib/akademi/demo-courses";
import { buttonVariants } from "@/components/ui/button";
export function generateStaticParams() { return demoCourses.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = demoCourses.find(c => c.slug === slug);
  return { title: course?.title, description: course?.description, robots: { index: false, follow: true } };
}
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = demoCourses.find(c => c.slug === slug);
  if (!course) notFound();
  return <div className="academy-detail page-width">
    <Link href="/akademi#egitimler" className="academy-text-link"><ArrowLeft size={16} /> Tüm eğitimler</Link>
    <div className="academy-detail-grid">
      <div>
        <p className="academy-kicker">{course.category} · NİLGÜN OYGUR AKADEMİ</p>
        <h1>{course.title}</h1><p className="academy-detail-intro">{course.description}</p>
        <div className="academy-detail-image"><Image src={demoCourseImage(course.image)} alt={course.title + " için kavramsal görsel"} fill sizes="(max-width:760px) 90vw, 760px" priority /></div>
        <section className="academy-syllabus"><p className="academy-kicker">ADIM ADIM KEŞFEDİN</p><h2>Eğitimin içinde neler var?</h2><p>Örnek program · Final içerik ve süreler değişebilir.</p>
          {course.modules.map((module,i) => <details key={module}><summary><span>0{i+1}</span>{module}</summary><p>Bu bölümde {module.toLocaleLowerCase("tr-TR")} konusunu tanıtan anlatımlar ve kişisel çalışma önerileri yer alacak.</p><p><Play size={14} aria-hidden="true" /> Video anlatımı ve uygulama notları · Demo içerik</p></details>)}
        </section>
      </div>
      <aside className="academy-purchase-card"><p className="academy-kicker">KENDİNİZE BİR ALAN AÇIN</p><h2>Yolculuğunuz burada başlasın.</h2><p className="academy-demo-label">Demo eğitim · Örnek fiyat</p><strong className="academy-detail-price">{demoPrice(course.price)}</strong><ul>{[course.lessons+" video ders · "+course.duration, "12 ay boyunca erişim", "Kendi ritminizde öğrenme", "Kişisel eğitim alanı"].map(x=><li key={x}><Check size={17} aria-hidden="true" />{x}</li>)}</ul><Link className={buttonVariants({size:"hero"})} href={`/akademi/${slug}/satin-al`}>Satın almayı dene <ArrowUpRight size={18} /></Link><p className="academy-demo-label">Bu bir önizlemedir. Ödeme alınmaz; ders sayısı, süre ve fiyat örnektir.</p><Link href="/akademi/giris" className="academy-text-link">Zaten hesabınız var mı? Giriş yapın</Link></aside>
    </div>
  </div>;
}
