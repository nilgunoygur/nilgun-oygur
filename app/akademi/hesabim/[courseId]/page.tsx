import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { studentPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { studentCourse } from "@/lib/akademi/learning";
import { courseCards } from "@/lib/akademi/server";
import { LessonChecklist } from "@/components/akademi/lesson-checklist";
import { accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eğitimim", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
const expiry = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

export default function CourseLearning({ params }: { params: Promise<{ courseId: string }> }) {
  return <section className={cn(pageWidth, accountPage, "max-w-[1100px]")}><Suspense fallback={<p role="status">Eğitiminiz yükleniyor…</p>}><Content params={params} /></Suspense></section>;
}
async function Content({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const viewer = await studentPage(`/akademi/hesabim/${courseId}`);
  const data = await studentCourse(getDatabase(), viewer.user.id, courseId);
  if (!data) notFound();
  const cards = await courseCards();
  return <><Link href="/akademi/hesabim" className="mb-9 inline-flex items-center gap-2 text-sm text-stone hover:text-forest"><ArrowLeft size={16} />Eğitimlerime dön</Link><header className="mb-9"><p className={kicker}>AKADEMİ · ÖĞRENME ALANINIZ</p><h1 className={accountTitle}>{cards[data.course.shopierProductId]?.title ?? "Akademi eğitimi"}</h1><p className="text-stone">Bir sonraki adımınız burada. İzleyin, uygulayın, kendinize zaman ayırın.</p><p className="mt-3 text-xs text-stone">Erişim bitişi: {expiry.format(data.grant.expiresAt)}</p></header><LessonChecklist lessons={data.lessons} /></>;
}
