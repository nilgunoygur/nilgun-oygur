import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { articles } from "@/lib/content";
import { ArticleCard } from "@/components/sliders";
import { Reveal } from "@/components/reveal";
export const metadata: Metadata = { title: "Yazılarım" };
export default function Blog() {
  const featured =
    articles.find((a) => a.href.includes("biliçaltının")) || articles[0];
  return (
    <section className="blog-page page-width">
      <h1 className="sr-only">Yazılarım</h1>
      <Reveal>
        <Link href={featured.href} className="featured-article">
          <div className="featured-image">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              sizes="(max-width:760px) 90vw, 55vw"
              preload
            />
          </div>
          <div>
            <p className="eyebrow">{featured.category}</p>
            <h2>{featured.title}</h2>
            <div className="article-meta">
              <span>{featured.date}</span>
              <span>{featured.duration}</span>
            </div>
          </div>
        </Link>
      </Reveal>
      <div className="articles-grid">
        {articles
          .filter((a) => a.href !== featured.href)
          .map((a) => (
            <Reveal key={a.href}>
              <ArticleCard article={a} />
            </Reveal>
          ))}
      </div>
      <div className="newsletter">
        <p className="eyebrow">Bir sonraki makaleyi mutlaka okuyun</p>
        <h2>En iyi makalelerin gelen kutunuza doğrudan teslimi.</h2>
        <a href="mailto:butunselsifaakademi@gmail.com?subject=Yaz%C4%B1lara%20abone%20olmak%20istiyorum">
          Abonelik için e-posta gönderin ↗
        </a>
      </div>
    </section>
  );
}
