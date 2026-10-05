import { Suspense } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { studentPage } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { courseForRoute } from "@/lib/akademi/course-route";
import { studentCourse } from "@/lib/akademi/learning";
import { akademi, courseCards } from "@/lib/akademi/server";
import { istanbulDay } from "@/lib/akademi/format";
import { LessonChecklist } from "@/components/akademi/lesson-checklist";
import { RefundRequestForm } from "@/components/akademi/refund-request-form";
import { RefundNotice } from "@/components/akademi/refund-notice";
import { accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

export const metadata = { title: "Eğitimim", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
const expiry = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

export default function CourseLearning({ params }: { params: Promise<{ slug: string }> }) {
  return <section className={cn(pageWidth, accountPage, "max-w-[1100px]")}><Suspense fallback={<PageLoader label="Eğitiminiz yükleniyor" />}><Content params={params} /></Suspense></section>;
}
async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await studentPage(`/akademi/hesabim/${slug}`);
  const course = await courseForRoute(getDatabase(), slug);
  if (!course) notFound();
  if (course.slug !== slug) permanentRedirect(`/akademi/hesabim/${course.slug}`);
  const courseId = course.id;
  const [data, cards, refund] = await Promise.all([studentCourse(getDatabase(), viewer.user.id, courseId), courseCards(), akademi().access.refundRequest(viewer.user.id, courseId)]);
  const back = <Link href="/akademi/hesabim" className="mb-9 inline-flex items-center gap-2 text-sm text-stone hover:text-forest"><ArrowLeft size={16} />Eğitimlerime dön</Link>;
  if (refund?.status === "pending" || refund?.status === "approved") return <>{back}<h1 className={accountTitle}>İade talebiniz</h1><RefundNotice status={refund.status} note={refund.ownerNote} /></>;
  if (!data) notFound();
  return <>{back}<header className="mb-9"><p className={kicker}>AKADEMİ · ÖĞRENME ALANINIZ</p><h1 className={accountTitle}>{cards[data.course.shopierProductId]?.title ?? "Akademi eğitimi"}</h1><p className="text-stone">Bir sonraki adımınız burada. İzleyin, uygulayın, kendinize zaman ayırın.</p><p className="mt-3 text-xs text-stone">Erişim bitişi: {expiry.format(data.grant.expiresAt)}</p></header><LessonChecklist today={istanbulDay(new Date())} lessons={data.lessons} />
    <section className="mt-14 border-t border-border pt-8 text-sm text-stone">
      {refund && <div className="mb-6"><RefundNotice status={refund.status} note={refund.ownerNote} /></div>}
      <details><summary className="cursor-pointer underline underline-offset-4">İade talep et</summary><div className="mt-5 max-w-xl"><RefundRequestForm courseId={courseId} /></div></details>
    </section></>;
}
