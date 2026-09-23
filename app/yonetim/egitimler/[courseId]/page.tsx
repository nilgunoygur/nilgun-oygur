import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ownerPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { ownerLessons } from "@/lib/akademi/lesson-editor";
import { courseCards } from "@/lib/akademi/server";
import { videoConfigured } from "@/lib/video/mux";
import { CourseEditor } from "@/components/akademi/lesson-editor";
import { accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ders içerikleri" };
export default function EditCourse({ params }: { params: Promise<{ courseId: string }> }) {
  return <section className={cn(pageWidth, accountPage, "max-w-[1050px]")}><Suspense fallback={<p>İçerikler yükleniyor…</p>}><Content params={params} /></Suspense></section>;
}
async function Content({ params }: { params: Promise<{ courseId: string }> }) {
  await ownerPage();
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const db = getDatabase();
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) notFound();
  const [rows, cards] = await Promise.all([ownerLessons(db, courseId), courseCards()]);
  return <><Link className="mb-8 inline-block text-sm underline underline-offset-4" href="/yonetim/egitimler">← Eğitimler ve satışlar</Link><header className="mb-9"><p className={kicker}>AKADEMİ YÖNETİMİ · DERS İÇERİKLERİ</p><h1 className={accountTitle}>{cards[course.shopierProductId]?.title ?? "Akademi eğitimi"}</h1><p className="leading-relaxed text-stone">Öğrencilerinizin göreceği dersleri burada hazırlayın. Eğitim adı, görseli ve fiyatı Shopier’den gelir.</p></header><CourseEditor courseId={courseId} rows={rows} uploadsEnabled={videoConfigured()} /></>;
}
