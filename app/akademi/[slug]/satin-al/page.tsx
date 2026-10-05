import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { formatAccess } from "@/lib/akademi/format";
import { catalogStaticParams, getCatalogCourse } from "@/lib/akademi/server";
import type { CatalogCourse } from "@/lib/akademi/catalog";
import { CoursePrice } from "@/components/akademi/course-price";
import { TrackedLink } from "@/components/analytics";
import { courseEcommerce } from "@/lib/analytics";
import { buttonVariants } from "@/components/ui/button";
import { accountCard, inlineLink, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Satın al", robots: { index: false, follow: false } };

export const generateStaticParams = catalogStaticParams;

const panel = cn(accountCard, "mt-6 shadow-none");
const note = "text-[14px] leading-relaxed text-stone";

// The course part is cached with the catalog; only the steps depend on the visitor.
export default async function Checkout({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCatalogCourse((await params).slug);
  if (!course) notFound();
  return <section className={cn(pageWidth, "max-w-[740px] pt-[160px] pb-[100px]")}>
    <p className={kicker}>AKADEMİ · SATIN AL</p>
    <h1 className="mt-5 mb-3 text-[48px] max-[681px]:text-[38px]">Öğrenmeye bir adım kaldı.</h1>
    <p className="mb-8 text-stone">Ödemenizi Shopier’de tamamlayın; eğitiminiz hesabınızda sizi bekliyor olacak.</p>
    <div className="flex flex-wrap items-end justify-between gap-5 rounded-[24px] bg-mist p-6 sm:p-8">
      <div className="min-w-0"><p className="mb-2 text-[11px] font-semibold tracking-[1.6px] text-forest">SEÇTİĞİNİZ EĞİTİM</p><h2 className="text-[26px] leading-snug">{course.title}</h2><p className={cn(note, "mt-2")}>{formatAccess(course.accessDurationDays)}</p></div>
      <CoursePrice large priceClassName="text-[34px]" priceKurus={course.priceKurus} compareAtPriceKurus={course.compareAtPriceKurus} />
    </div>
    <Suspense fallback={<div className={cn(panel, "min-h-[280px]")} />}>
      <CheckoutSteps course={course} />
    </Suspense>
    <p className={cn(note, "mt-8 text-center")}>Ödemenizi yaptınız mı? <Link href="/akademi/satin-alim-sonrasi" className={inlineLink}>Eğitiminize nasıl ulaşacağınızı görün</Link></p>
  </section>;
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <li className="flex gap-4"><span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-[13px] font-semibold text-forest">{number}</span><div className="min-w-0"><h3 className="text-[17px] font-semibold leading-8 text-forest">{title}</h3><div className={note}>{children}</div></div></li>;
}

function PayButton({ course, signedIn }: { course: CatalogCourse; signedIn: boolean }) {
  return <TrackedLink event="begin_checkout" params={{ ...courseEcommerce(course), signed_in: signedIn }} className={cn(buttonVariants({ size: "hero", variant: signedIn ? "default" : "outline" }), "w-full sm:w-auto")} href={course.shopierUrl} target="_blank" rel="noopener">{signedIn ? "Shopier ile güvenle öde" : "Hesap açmadan Shopier ile öde"} <ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only">(yeni sekmede açılır)</span></TrackedLink>;
}

/** The only per-visitor part: which email to use at Shopier. */
async function CheckoutSteps({ course }: { course: CatalogCourse }) {
  const email = (await getViewer())?.user.email;
  const back = encodeURIComponent(`/akademi/${course.slug}/satin-al`);
  const secure = <p className={cn(note, "flex items-center gap-2")}><ShieldCheck className="size-4 shrink-0 text-forest" aria-hidden="true" />Kart bilgileriniz yalnızca Shopier’de işlenir.</p>;
  return email ? <div className={panel}>
    <ol className="grid gap-6">
      <Step number={1} title="Shopier’de ödeyin">Ödeme sayfasında bu e-posta adresini yazın:<span className="mt-2 block w-fit max-w-full break-all rounded-xl bg-mist px-3.5 py-2 text-[15px] font-semibold text-forest">{email}</span></Step>
      <Step number={2} title="Eğitiminiz hesabınıza eklenir">Ödemeniz onaylanınca kendiliğinden eklenir; bir şey yapmanız gerekmez.</Step>
      <Step number={3} title="Öğrenmeye başlayın">Bu siteye dönün ve <Link href="/akademi/hesabim" className={inlineLink}>hesabınızdan</Link> eğitiminizi açın.</Step>
    </ol>
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"><PayButton course={course} signedIn />{secure}</div>
    <p className={cn(note, "mt-6 border-t border-border pt-5")}>Shopier’de farklı bir e-posta kullanırsanız eğitimi <Link href="/akademi/siparis-ekle" className={inlineLink}>sipariş numaranızla</Link> hesabınıza ekleyebilirsiniz.</p>
  </div> : <div className={panel}>
    <h3 className="text-[20px] font-semibold text-forest">Önce hesabınıza girin</h3>
    <p className={cn(note, "mt-2")}>Eğitiminize ödemeden sonra hesabınızdan ulaşırsınız. Giriş yapın ya da ücretsiz hesap oluşturun; Shopier’de aynı e-posta adresini kullanın.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link className={buttonVariants({ size: "hero" })} href={`/akademi/giris?next=${back}`}>Giriş yap</Link>
      <Link className={buttonVariants({ size: "hero", variant: "outline" })} href={`/akademi/kayit?next=${back}`}>Hesap oluştur</Link>
    </div>
    <div className="mt-8 border-t border-border pt-6">
      <p className={cn(note, "mb-4")}>Hesabınız olmadan da ödeyebilirsiniz. Daha sonra aynı e-posta adresiyle kayıt olduğunuzda eğitiminiz hesabınızda görünür.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4"><PayButton course={course} signedIn={false} />{secure}</div>
    </div>
  </div>;
}
