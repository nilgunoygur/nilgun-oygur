import type { Metadata } from "next";
import { About, SocialSection, Journey, BlogSection } from "@/components/site";
export const metadata: Metadata = { title: "Hakkımda" };
export default function Biography() {
  return (
    <>
      <About full />
      <SocialSection />
      <Journey />
      <BlogSection />
    </>
  );
}
