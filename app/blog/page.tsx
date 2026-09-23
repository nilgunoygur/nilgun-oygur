import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/sliders";
import { Reveal } from "@/components/reveal";
import { articleMeta, eyebrow, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export const metadata: Metadata = {
  title: "Yazılarım",
  description: "Nilgün Oygur'un kişisel gelişim, farkındalık ve dönüşüm üzerine yazılarını keşfedin.",
  alternates: { canonical: "/blog" },
};
export default function Blog() {
  return <Suspense fallback={<div className="min-h-[70vh]" />}><BlogContent /></Suspense>;
}
async function BlogContent() {
  const articles = await getPublicArticles();
  if (!articles.length) return <section className={cn(pageWidth, "min-h-[70vh] pt-[175px] max-tablet:pt-[135px]")}><h1>Yazılarım</h1><p className="mt-5 text-stone">Yeni yazılar yakında burada olacak.</p></section>;
  const featured =
    articles.find((a) => a.href.includes("biliçaltının")) || articles[0];
  return (
    <section className={cn(pageWidth, "relative isolate pt-[175px] pb-20 before:absolute before:inset-x-0 before:top-[442px] before:bottom-0 before:-z-1 before:bg-muted before:content-[''] max-tablet:pt-[135px]")}>
      <h1 className="sr-only">Yazılarım</h1>
      <Reveal>
        <Link href={featured.href} className="relative mb-[110px] block min-h-[430px] max-tablet:mb-[60px] max-tablet:flex max-tablet:min-h-0 max-tablet:flex-col max-tablet:gap-0">
          <div className="relative ml-auto h-[430px] w-[62%] overflow-hidden rounded-[20px] max-tablet:h-[300px] max-tablet:w-full">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              sizes="(max-width:760px) 90vw, 55vw"
              preload
            />
          </div>
          <div className="absolute top-[60px] left-0 w-[600px] max-w-[54%] rounded-[12px] bg-white p-10 shadow-[0_8px_35px_#00000005] max-tablet:relative max-tablet:top-auto max-tablet:-mt-[45px] max-tablet:w-[calc(100%-24px)] max-tablet:max-w-none max-tablet:self-center max-tablet:p-[25px]">
            <p className={cn(eyebrow, "text-[20px] max-tablet:text-[20px]")}>{featured.category}</p>
            <h2 className="text-[44px] leading-[1.2] tracking-[-1px] max-tablet:text-[34px]">{featured.title}</h2>
            <div className={cn(articleMeta, "mt-5")}>
              <span>{featured.date}</span>
              <span>{featured.duration}</span>
            </div>
          </div>
        </Link>
      </Reveal>
      <div className="grid grid-cols-3 auto-rows-fr gap-x-7 gap-y-[65px] max-tablet:grid-cols-1 max-tablet:auto-rows-auto max-tablet:gap-[45px]">
        {articles
          .filter((a) => a.href !== featured.href)
          .map((a) => (
            <Reveal key={a.href} className="h-full">
              <ArticleCard article={a} card />
            </Reveal>
          ))}
      </div>
      <div className="mt-[100px] rounded-[24px] bg-muted px-[30px] py-[70px] text-center max-tablet:mt-[70px] max-tablet:px-6 max-tablet:py-[45px]">
        <p className={eyebrow}>Bir sonraki makaleyi mutlaka okuyun</p>
        <h2 className="mx-auto mt-[15px] mb-7 max-w-[800px] text-[40px] max-tablet:text-[30px]">En iyi makalelerin gelen kutunuza doğrudan teslimi.</h2>
        <a className="text-primary" href="mailto:butunselsifaakademi@gmail.com?subject=Yaz%C4%B1lara%20abone%20olmak%20istiyorum">
          Abonelik için e-posta gönderin ↗
        </a>
      </div>
    </section>
  );
}
