import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { articles as importedArticles } from "@/lib/content";
import { getPublicArticles } from "@/lib/articles";
import { normalizeSlug } from "@/lib/route-slug";
import { BlogSection } from "@/components/site";
import { CopyLink } from "@/components/sliders";
import { articleMeta, eyebrow, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";
export function generateStaticParams() {
  return importedArticles.map((a) => ({ slug: a.href.slice(6) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const articles = await getPublicArticles();
  const a = articles.find((a) => a.href === `/blog/${normalizeSlug(slug)}`);
  return {
    title: a?.title,
    description: a?.body[0]?.text,
    openGraph: { type: "article", title: a?.title, images: a ? [a.image] : [] },
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <Suspense fallback={<div className="min-h-[70vh]" />}><ArticleContent params={params} /></Suspense>;
}
async function ArticleContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articles = await getPublicArticles();
  const a = articles.find((a) => a.href === `/blog/${normalizeSlug(slug)}`);
  if (!a) notFound();
  return (
    <>
      <article className={cn(pageWidth, "max-w-[1180px] pt-[165px] max-tablet:pt-[140px]")}>
        <Link href="/blog" className="mb-16 block text-[20px] text-primary max-tablet:mb-[42px]">
          ‹ &nbsp; Blog
        </Link>
        <header className="mx-auto mb-6 max-w-[900px] text-center">
          <p className={cn(eyebrow, "text-[24px] max-tablet:text-[20px]")}>{a.category}</p>
          <h1 className="font-display text-[60px] font-normal tracking-[0px] text-foreground max-tablet:text-[38px]">{a.title}</h1>
          <div className={cn(articleMeta, "mt-16 mb-0 items-center justify-center gap-6 text-[20px] max-tablet:mt-8 max-tablet:flex-wrap max-tablet:gap-[14px] max-tablet:text-[13px]")}>
            <span className="flex items-center gap-[6px]">
              <Image src={a.authorImage} alt="" width={32} height={32} className="rounded-full max-tablet:size-7" />
              Nilgün Oygur
            </span>
            <span>{a.date}</span>
            <span>{a.duration}</span>
          </div>
        </header>
        <div className="relative aspect-[1.484] overflow-hidden rounded-[12px] max-tablet:aspect-[1.2]">
          <Image
            src={a.image}
            alt={a.title}
            fill
            unoptimized={a.image.startsWith("/api/article-images/")}
            sizes="(max-width:760px) 95vw, 1100px"
            preload
          />
        </div>
        <div className="mx-auto mt-[70px] max-w-[760px] max-tablet:mt-10">
          <CopyLink />
          {a.richBody ? <div className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-mint [&_blockquote]:pl-5 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[28px] [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[23px] [&_li]:mb-2 [&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:pl-7 [&_p]:mb-6 [&_p]:text-[19px] [&_p]:leading-[1.8] [&_p]:text-[#686866] [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-7 max-tablet:[&_p]:text-[17px]" dangerouslySetInnerHTML={{ __html: a.richBody }} /> : a.body.map((block, i) =>
            block.tag.startsWith("h") || block.text.endsWith(":") ? (
              <h2 key={i} className="mt-10 mb-4 text-[28px] tracking-[-0.5px] max-tablet:text-[25px]">{block.text}</h2>
            ) : (
              <p key={i} className="mb-6 text-[19px] leading-[1.8] text-[#686866] max-tablet:text-[17px]">{block.text}</p>
            ),
          )}
        </div>
      </article>
      <BlogSection />
    </>
  );
}
