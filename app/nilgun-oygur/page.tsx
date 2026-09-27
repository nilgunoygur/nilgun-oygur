import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { ProfilePageJsonLd } from "next-seo";
import { portrait, socials } from "@/lib/content";
import { About, SocialSection, Journey, BlogSection } from "@/components/site";
export const metadata = pageMetadata("Hakkımda", "Nilgün Oygur’u tanıyın. Yaşam yolculuğu, kitapları ve kişisel gelişim alanındaki çalışmalarını keşfedin.", "/nilgun-oygur");
export default function Biography() {
  return (
    <>
      <ProfilePageJsonLd mainEntity={{ "@type": "Person", name: "Nilgün Oygur", url: absoluteUrl("/nilgun-oygur"), image: absoluteUrl(portrait), sameAs: socials.map(social => social.href) }} />
      <About full />
      <SocialSection />
      <Journey />
      <BlogSection />
    </>
  );
}
