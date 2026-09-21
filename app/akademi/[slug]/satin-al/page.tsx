import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowUpRight, MailCheck } from "lucide-react";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { formatAccess, formatPrice, getCatalogCourse } from "@/lib/akademi/catalog";
import { normalizeSlug } from "@/lib/route-slug";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Satın al", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Checkout({ params }: { params: Promise<{ slug: string }> }) {
  const slug = normalizeSlug((await params).slug);
  const course = slug ? await getCatalogCourse(slug) : null;
  if (!course?.shopierUrl) notFound();
  const session = isAuthConfigured() ? await getAuth().api.getSession({ headers: await headers() }) : null;
  const email = session?.user.emailVerified ? session.user.email : null;
  const back = encodeURIComponent(`/akademi/${course.slug}/satin-al`);
  const pay = <a className={buttonVariants({ size: "hero" })} href={course.shopierUrl} rel="noopener">Shopier ile öde <ArrowUpRight size={18} aria-hidden="true" /></a>;
  return <section className="academy-checkout page-width">
    <p className="academy-kicker">AKADEMİ · SATIN AL</p>
    <h1>Öğrenmeye bir adım daha.</h1>
    <div className="academy-checkout-summary"><h2>{course.title}</h2><strong>{formatPrice(course.priceKurus)}</strong><p>{formatAccess(course.accessDurationDays)} · Ödeme Shopier güvencesiyle alınır.</p></div>
    {email ? <div className="academy-checkout-steps">
      <p><MailCheck size={20} aria-hidden="true" /> Shopier ödeme sayfasında bu e-posta adresini kullanın: <strong>{email}</strong></p>
      <p>Ödemeniz onaylandığında eğitiminiz hesabınıza otomatik olarak eklenir. Farklı bir e-posta kullanırsanız, sipariş numaranızla hesabınızdan ekleyebilirsiniz.</p>
      {pay}
      <Link href="/akademi/hesabim" className="academy-text-link">Hesabıma git</Link>
    </div> : <div className="academy-checkout-steps">
      <p>Eğitiminize ödemeden sonra hesabınızdan ulaşırsınız. Önce giriş yapın ya da ücretsiz hesap oluşturun; Shopier’de aynı e-posta adresini kullanın.</p>
      <div className="flex flex-wrap gap-3">
        <Link className={buttonVariants({ size: "hero" })} href={`/akademi/giris?next=${back}`}>Giriş yap</Link>
        <Link className={buttonVariants({ size: "hero", variant: "outline" })} href="/akademi/kayit">Hesap oluştur</Link>
      </div>
      <p>Hesabınız yoksa da ödeme yapabilirsiniz. Daha sonra aynı e-posta adresiyle kayıt olduğunuzda eğitiminiz hesabınızda görünür.</p>
      <a className="academy-text-link" href={course.shopierUrl} rel="noopener">Hesapsız devam et ve Shopier ile öde</a>
    </div>}
  </section>;
}
