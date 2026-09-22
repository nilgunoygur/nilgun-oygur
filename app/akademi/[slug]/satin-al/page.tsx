import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MailCheck } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { formatAccess } from "@/lib/akademi/format";
import { catalogStaticParams, getCatalogCourse } from "@/lib/akademi/server";
import type { CatalogCourse } from "@/lib/akademi/catalog";
import { CoursePrice } from "@/components/akademi/course-price";
import { buttonVariants } from "@/components/ui/button";
import { kicker, pageWidth, textLink } from "@/lib/styles";
import { cn } from "@/lib/utils";

const steps = "mt-[35px] flex flex-col items-start gap-[25px] leading-[1.8]";

export const metadata: Metadata = { title: "Satın al", robots: { index: false, follow: false } };

export const generateStaticParams = catalogStaticParams;

// The course part is cached with the catalog; only the email step depends on the visitor.
export default async function Checkout({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCatalogCourse((await params).slug);
  if (!course) notFound();
  return <section className={cn(pageWidth, "max-w-[740px] pt-[160px] pb-[100px]")}>
    <p className={kicker}>AKADEMİ · SATIN AL</p>
    <h1 className="mt-5 mb-[35px] text-[48px]">Öğrenmeye bir adım daha.</h1>
    <div className="rounded-[20px] bg-mist p-[30px]"><h2 className="mb-[15px] text-[28px]">{course.title}</h2><CoursePrice large priceClassName="text-[34px]" priceKurus={course.priceKurus} compareAtPriceKurus={course.compareAtPriceKurus} /><p>{formatAccess(course.accessDurationDays)} · Ödeme Shopier güvencesiyle alınır.</p></div>
    <Suspense fallback={<div className={steps} />}>
      <CheckoutSteps course={course} />
    </Suspense>
  </section>;
}

/** The only per-visitor part: which email to use at Shopier. */
async function CheckoutSteps({ course }: { course: CatalogCourse }) {
  const email = (await getViewer())?.user.email;
  const back = encodeURIComponent(`/akademi/${course.slug}/satin-al`);
  return email ? <div className={steps}>
    <p><MailCheck size={20} aria-hidden="true" className="mr-[6px] inline align-[-4px]" /> Shopier ödeme sayfasında bu e-posta adresini kullanın: <strong>{email}</strong></p>
    <p>Ödemeniz onaylandığında eğitiminiz hesabınıza otomatik olarak eklenir. Farklı bir e-posta kullanırsanız, sipariş numaranızla hesabınızdan ekleyebilirsiniz.</p>
    <a className={buttonVariants({ size: "hero" })} href={course.shopierUrl} rel="noopener">Shopier ile öde <ArrowUpRight size={18} aria-hidden="true" /></a>
    <Link href="/akademi/hesabim" className={textLink}>Hesabıma git</Link>
  </div> : <div className={steps}>
    <p>Eğitiminize ödemeden sonra hesabınızdan ulaşırsınız. Önce giriş yapın ya da ücretsiz hesap oluşturun; Shopier’de aynı e-posta adresini kullanın.</p>
    <div className="flex flex-wrap gap-3">
      <Link className={buttonVariants({ size: "hero" })} href={`/akademi/giris?next=${back}`}>Giriş yap</Link>
      <Link className={buttonVariants({ size: "hero", variant: "outline" })} href="/akademi/kayit">Hesap oluştur</Link>
    </div>
    <p>Hesabınız yoksa da ödeme yapabilirsiniz. Daha sonra aynı e-posta adresiyle kayıt olduğunuzda eğitiminiz hesabınızda görünür.</p>
    <a className={textLink} href={course.shopierUrl} rel="noopener">Hesapsız devam et ve Shopier ile öde</a>
  </div>;
}
