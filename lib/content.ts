import { z } from "zod";
import reference from "./reference.json";

const pageSchema = z.object({
  title: z.string(),
  text: z.array(z.object({ tag: z.string(), text: z.string() })),
  images: z.array(z.string()),
  links: z.array(z.object({ text: z.string(), href: z.string() })),
});
export const pages = z.record(z.string(), pageSchema).parse(reference);
export const bookingUrl = "https://calendly.com/butunselsifaakademi/meetings";
export const email = "butunselsifaakademi@gmail.com";
export const asset = (url: string) =>
  `/images/${url.split("/").pop()?.split("?")[0]}`;
export const portrait = asset(pages["/"].images[1]);
export const logo = asset(pages["/"].images[0]);
export const socials = [
  { label: "Tiktok", href: "https://www.tiktok.com/@nilgun_oygur" },
  { label: "Instagram", href: "https://www.instagram.com/nilgun_oygur/" },
  { label: "Youtube", href: "https://www.youtube.com/@nilgunoygur4942" },
];
export const nav = [
  { label: "Kitaplarım", href: "/kitaplarim" },
  { label: "Eğitimlerim", href: "/egitimlerim" },
  { label: "Yazılarım", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
  { label: "Akademi", href: "/akademi" },
];
export const courses = [
  "kuatum-egitimi",
  "bioenerji-egitimi",
  "dogal-tas-egitimi",
  "regresyon-egitimi",
].map((slug, i) => {
  const page = pages[`/egitimlerim/${slug}`];
  const title = page.text.find((x) => x.tag === "h1")!.text;
  const catalog = pages["/egitimlerim"].text;
  const description =
    catalog[catalog.findIndex((x) => x.text === title) + 1].text;
  const start = page.text.findIndex((x) => x.text === "Eğitim Programı") + 1;
  const end = page.text.findIndex((x) => x.text === "Görüşme Ayarlayın");
  const program: { title: string; lines: string[] }[] = [];
  for (const item of page.text.slice(start, end)) {
    if (
      (!/[.!?]$/.test(item.text) && item.text.length < 85) ||
      item.text.startsWith("Modül")
    )
      program.push({ title: item.text, lines: [] });
    else if (program.length) program[program.length - 1].lines.push(item.text);
    else program.push({ title: item.text, lines: [] });
  }
  return {
    slug,
    href: `/egitimlerim/${slug}`,
    title,
    description,
    intro: page.text[7].text,
    image: asset(page.images[1]),
    cardImage: asset(pages["/egitimlerim"].images[i + 1]),
    program,
    gallery: page.images
      .slice(2)
      .filter((x) => !x.endsWith(".svg"))
      .slice(0, 8)
      .map(asset),
  };
});
export const articles = Object.entries(pages)
  .filter(([path]) => path.startsWith("/blog/"))
  .map(([href, page]) => {
    const titleIndex = page.text.findIndex((x) => x.tag === "h1");
    const start = page.text.findIndex((x) => x.text === "Copy Link") + 1;
    const end = page.text.findIndex((x) => x.text === "Güncel");
    const category = page.text[titleIndex - 1].text;
    return {
      href,
      title: page.text[titleIndex].text,
      category: category === "Blog" ? "İletişim" : category,
      date: page.text[titleIndex + 1].text,
      duration: page.text[titleIndex + 2].text,
      image: asset(page.images[2]),
      authorImage: asset(page.images[1]),
      body: page.text
        .slice(start, end < 0 ? undefined : end)
        .filter((x) => !x.text.startsWith("/ /")),
    };
  });
export const blogIntro =
  "Daha mutlu, daha sağlıklı ve daha tatmin edici bir hayata doğru yolculuğunuzda size yardımcı olacak yeni anlayışları, pratik ipuçlarını ve güçlendirici hikayeleri keşfedin. Aşağıdaki en son gönderilerimize göz atın ve sürekli büyüme ve kendini keşfetme yoluna çıkın.";
