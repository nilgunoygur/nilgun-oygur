import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowUpRight, Eye } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { bundleItems, courses } from "@/lib/db/schema";
import { fallbackCover } from "@/lib/akademi/catalog";
import { buttonVariants } from "@/components/ui/button";
import { courseForRoute } from "@/lib/akademi/course-route";
import { publishedLessons } from "@/lib/akademi/learning";
import { courseCards } from "@/lib/akademi/server";
import { LessonChecklist } from "@/components/akademi/lesson-checklist";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { accountTitle, kicker, ownerSection, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

export const metadata = { title: "Öğrenci önizlemesi" };

export default function CoursePreview({ params }: { params: Promise<{ slug: string }> }) {
  return <section className={cn(pageWidth, ownerSection, "max-w-[1100px]")}><Suspense fallback={<PageLoader label="Önizleme yükleniyor" />}><Content params={params} /></Suspense></section>;
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = await ownerPage();
  const { slug } = await params;
  const db = getDatabase();
  const course = await courseForRoute(db, slug);
  if (!course) notFound();
  if (course.slug !== slug) redirect(`/yonetim/egitimler/${course.slug}/onizleme`);
  const [cards, included] = await Promise.all([courseCards(), db.select({ slug: courses.slug, productId: courses.shopierProductId }).from(bundleItems).innerJoin(courses, eq(courses.id, bundleItems.courseId)).where(eq(bundleItems.bundleId, course.id)).orderBy(asc(courses.createdAt))]);
  const title = cards[course.shopierProductId]?.title ?? "Akademi eğitimi";
  const back = <OwnerBackLink href={`/yonetim/egitimler/${course.slug}`}>{included.length ? "Pakete dön" : "Ders içeriklerine dön"}</OwnerBackLink>;
  if (included.length) return <>
    {back}
    <Alert className="mb-9"><Eye /><AlertTitle>Öğrenci önizlemesi</AlertTitle><AlertDescription>“{title}” paketini satın alan öğrencinin hesabına bu {included.length} eğitim ayrı ayrı eklenir. Bir eğitimi öğrencinin gördüğü gibi açmak için üzerine tıklayın.</AlertDescription></Alert>
    <header className="mb-9"><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Eğitimleriniz</h1></header>
    <div className="grid grid-cols-2 gap-8 max-tablet:grid-cols-1">{included.map(item => {
      const card = cards[item.productId], href = `/yonetim/egitimler/${item.slug}/onizleme`;
      return <article key={item.slug} className="flex min-w-0 flex-col rounded-[24px] border border-[#e1e8dc] bg-white p-[10px] shadow-[0_6px_25px_#19392f08]">
        <Link href={href} className="relative block aspect-[1.65] overflow-hidden rounded-[17px] bg-mist"><img src={card?.image ?? fallbackCover} alt="" className="size-full object-cover" /></Link>
        <div className="flex flex-1 flex-col px-[18px] pt-6 pb-[18px] max-tablet:px-[10px]">
          <p className="mb-3 text-[10px] font-semibold tracking-[1.6px] text-stone">EĞİTİMİNİZ</p>
          <h2 className="mb-5 text-[28px] leading-snug max-tablet:text-[25px]"><Link href={href}>{card?.title ?? "Akademi eğitimi"}</Link></h2>
          <div className="mt-auto border-t border-border pt-5"><Link className={buttonVariants({ size: "pill", className: "min-h-11 bg-forest hover:bg-forest/90" })} href={href}>Eğitime devam et <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        </div>
      </article>;
    })}</div>
  </>;
  const lessons = await publishedLessons(db, viewer.user.id, course.id);
  return <>
    {back}
    <Alert className="mb-9"><Eye /><AlertTitle>Öğrenci önizlemesi</AlertTitle><AlertDescription>Bu eğitimi satın alan öğrencinin gördüğü sayfa. Yalnızca yayınladığınız dersler görünür. Tüm dersler açıktır, ilerleme kaydedilmez ve Zoom bağlantısı açılmaz.</AlertDescription></Alert>
    <header className="mb-9"><p className={kicker}>AKADEMİ · ÖĞRENME ALANINIZ</p><h1 className={accountTitle}>{title}</h1></header>
    <LessonChecklist lessons={lessons} preview empty={<><h2 className="text-2xl">Yayınlanmış ders yok.</h2><p className="mt-3 text-stone">Öğrenciler yalnızca yayınladığınız dersleri görür; bu eğitimin dersleri henüz taslak.</p></>} />
  </>;
}
