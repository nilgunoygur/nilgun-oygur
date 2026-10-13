import { Suspense } from "react";
import Link from "next/link";
import { Eye, Package } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { courseForRoute } from "@/lib/akademi/course-route";
import { ownerLessons } from "@/lib/akademi/lesson-editor";
import { ownerBundleCourses } from "@/lib/akademi/server";
import { attachedVideos, videoConfigured } from "@/lib/video/mux";
import { filesConfigured } from "@/lib/files/storage";
import { CourseEditor } from "@/components/akademi/lesson-editor";
import { PackageContentsButton, PackagePanel } from "@/components/akademi/package-panel";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";
import { buttonVariants } from "@/components/ui/button";
import { ownerSection, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

export const metadata = { title: "Ders içerikleri" };
export default function EditCourse({ params }: { params: Promise<{ slug: string }> }) {
  return <section className={cn(pageWidth, ownerSection, "max-w-[1050px]")}><Suspense fallback={<PageLoader label="İçerikler yükleniyor" />}><Content params={params} /></Suspense></section>;
}
async function Content({ params }: { params: Promise<{ slug: string }> }) {
  await ownerPage();
  const { slug } = await params;
  const db = getDatabase();
  const course = await courseForRoute(db, slug);
  if (!course) notFound();
  if (course.slug !== slug) permanentRedirect(`/yonetim/egitimler/${course.slug}`);
  const courseId = course.id;
  const lessonsWithVideos = ownerLessons(db, courseId).then(async rows => {
    const videos = await attachedVideos(rows.map(row => row.asset));
    return rows.map(row => ({ ...row, video: row.asset?.muxAssetId ? videos[row.asset.muxAssetId] : undefined }));
  });
  const [rows, courses] = await Promise.all([lessonsWithVideos, ownerBundleCourses()]);
  const current = courses.find(item => item.id === courseId);
  const packaged = !!current?.includes.length;
  const editor = <CourseEditor courseId={courseId} rows={rows} muxConfigured={videoConfigured()} filesConfigured={filesConfigured()} />;
  return <>
    <OwnerBackLink href="/yonetim/egitimler">Eğitimler ve satışlar</OwnerBackLink>
    <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
      <div><p className={kicker}>AKADEMİ YÖNETİMİ · {packaged ? "PAKET" : "DERS İÇERİKLERİ"}</p><h1 className={accountTitle}>{current?.title ?? "Akademi eğitimi"}</h1><p className="leading-relaxed text-stone">{packaged ? "Bu ürün bir paket: kendi dersi yoktur, içindeki eğitimleri birlikte satar. Satın alan öğrenci her eğitimi hesabında ayrı ayrı görür. Adı, görseli ve fiyatı Shopier’den gelir." : "Öğrencilerinizin göreceği dersleri burada hazırlayın. Eğitim adı, görseli ve fiyatı Shopier’den gelir."}</p></div>
      <div className="flex flex-wrap gap-2">
        {current && !packaged && !current.inBundle && <PackageContentsButton course={current} courses={courses}><Package />Pakete dönüştür</PackageContentsButton>}
        <Link href={`/yonetim/egitimler/${course.slug}/onizleme`} className={buttonVariants({ variant: "outline", size: "pill" })}><Eye />Öğrenci gözüyle önizle</Link>
      </div>
    </header>
    {packaged ? <>
      <PackagePanel course={current} courses={courses} />
      {rows.length > 0 && <details className="mt-10 text-sm text-stone"><summary className="cursor-pointer underline underline-offset-4">Bu ürüne daha önce eklenmiş {rows.length} ders var; paket olduğu için öğrencilere gösterilmez</summary><div className="mt-6">{editor}</div></details>}
    </> : editor}
  </>;
}
