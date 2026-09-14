import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { articles } from "@/lib/content";
import { normalizeSlug } from "@/lib/route-slug";
import { BlogSection } from "@/components/site";
import { CopyLink } from "@/components/sliders";
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.href.slice(6) }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  const { slug } = await params;
  const a = articles.find((a) => a.href === `/blog/${normalizeSlug(slug)}`);
  if (!a) notFound();
  return (
    <>
      <article className="article-page page-width">
        <Link href="/blog" className="article-back">
          ‹ &nbsp; Blog
        </Link>
        <header className="article-header">
          <p className="eyebrow">{a.category}</p>
          <h1>{a.title}</h1>
          <div className="article-meta">
            <span className="article-author">
              <Image src={a.authorImage} alt="" width={32} height={32} />
              Nilgün Oygur
            </span>
            <span>{a.date}</span>
            <span>{a.duration}</span>
          </div>
        </header>
        <div className="article-cover">
          <Image
            src={a.image}
            alt={a.title}
            fill
            sizes="(max-width:760px) 95vw, 1100px"
            preload
          />
        </div>
        <div className="article-body">
          <CopyLink />
          {a.body.map((block, i) =>
            block.tag.startsWith("h") || block.text.endsWith(":") ? (
              <h2 key={i}>{block.text}</h2>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
        </div>
      </article>
      <BlogSection />
    </>
  );
}
