import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { courseForRoute } from "@/lib/akademi/course-route";
import { publishedLessons } from "@/lib/akademi/learning";
import { ownerBundleCourses } from "@/lib/akademi/server";
import { LessonPreview } from "@/components/akademi/lesson-preview";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";
import { StudentCourseCard } from "@/components/akademi/student-course-card";
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
  const all = await ownerBundleCourses();
  const current = all.find(item => item.id === course.id);
  const included = all.filter(item => current?.includes.includes(item.id));
  const title = current?.title ?? "Akademi eğitimi";
  const top = (back: string, notice: string) => <>
    <OwnerBackLink href={`/yonetim/egitimler/${course.slug}`}>{back}</OwnerBackLink>
    <Alert className="mb-9"><Eye /><AlertTitle>Öğrenci önizlemesi</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>
  </>;
  if (included.length) return <>
    {top("Pakete dön", `“${title}” paketini satın alan öğrencinin hesabına bu ${included.length} eğitim ayrı ayrı eklenir. Bir eğitimi öğrencinin gördüğü gibi açmak için üzerine tıklayın.`)}
    <header className="mb-9"><p className={kicker}>AKADEMİ · KİŞİSEL ALANINIZ</p><h1 className={accountTitle}>Eğitimleriniz</h1></header>
    <div className="grid grid-cols-2 gap-8 max-tablet:grid-cols-1">{included.map(item => <StudentCourseCard key={item.id} href={`/yonetim/egitimler/${item.slug}/onizleme`} title={item.title} image={item.image} action="Eğitime devam et" />)}</div>
  </>;
  return <>
    {top("Ders içeriklerine dön", "Bu eğitimi satın alan öğrencinin gördüğü sayfa. Yalnızca yayınladığınız dersler görünür. Tüm dersler açıktır, ilerleme kaydedilmez ve Zoom bağlantısı açılmaz.")}
    <header className="mb-9"><p className={kicker}>AKADEMİ · ÖĞRENME ALANINIZ</p><h1 className={accountTitle}>{title}</h1></header>
    <LessonPreview lessons={await publishedLessons(db, viewer.user.id, course.id)} empty={<><h2 className="text-2xl">Yayınlanmış ders yok.</h2><p className="mt-3 text-stone">Öğrenciler yalnızca yayınladığınız dersleri görür; bu eğitimin dersleri henüz taslak.</p></>} />
  </>;
}
