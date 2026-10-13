import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { courseForRoute } from "@/lib/akademi/course-route";
import { publishedLessons } from "@/lib/akademi/learning";
import { courseCards } from "@/lib/akademi/server";
import { LessonChecklist } from "@/components/akademi/lesson-checklist";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

export const metadata = { title: "Öğrenci önizlemesi" };

export default function CoursePreview({ params }: { params: Promise<{ slug: string }> }) {
  return <section className={cn(pageWidth, accountPage, "max-w-[1100px]")}><Suspense fallback={<PageLoader label="Önizleme yükleniyor" />}><Content params={params} /></Suspense></section>;
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = await ownerPage();
  const { slug } = await params;
  const db = getDatabase();
  const course = await courseForRoute(db, slug);
  if (!course) notFound();
  if (course.slug !== slug) redirect(`/yonetim/egitimler/${course.slug}/onizleme`);
  const [lessons, cards] = await Promise.all([publishedLessons(db, viewer.user.id, course.id), courseCards()]);
  return <>
    <OwnerBackLink href={`/yonetim/egitimler/${course.slug}`}>Ders içeriklerine dön</OwnerBackLink>
    <Alert className="mb-9"><Eye /><AlertTitle>Öğrenci önizlemesi</AlertTitle><AlertDescription>Bu eğitimi satın alan öğrencinin gördüğü sayfa. Yalnızca yayınladığınız dersler görünür. Tüm dersler açıktır, ilerleme kaydedilmez ve Zoom bağlantısı açılmaz.</AlertDescription></Alert>
    <header className="mb-9"><p className={kicker}>AKADEMİ · ÖĞRENME ALANINIZ</p><h1 className={accountTitle}>{cards[course.shopierProductId]?.title ?? "Akademi eğitimi"}</h1></header>
    <LessonChecklist lessons={lessons} preview />
  </>;
}
