import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoCourses, demoPrice } from "@/lib/akademi/demo-courses";
import { DemoCheckout } from "@/components/akademi/demo-checkout";
export const metadata: Metadata = { title: "Demo satın alma", robots: { index: false, follow: false } };
export default async function Checkout({ params }: { params: Promise<{ slug: string }> }) {
 const {slug} = await params;
 const course = demoCourses.find(c=>c.slug===slug);
 if (!course) notFound();
 return <section className="academy-demo-checkout page-width"><p className="academy-kicker">AKADEMİ · DEMO SATIN ALMA</p><h1>Öğrenmeye bir adım daha.</h1><div className="academy-checkout-summary"><h2>{course.title}</h2><strong>{demoPrice(course.price)}</strong><p>Örnek fiyat · Tahsil edilecek tutar: ₺0</p></div><DemoCheckout slug={slug} /></section>;
}
