import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getPublishedBanner } from "@/lib/banner";
import { Footer } from "@/components/site";
import { MotionProvider } from "@/components/motion-provider";
import { config } from "@/lib/config";
import "./globals.css";
const general = localFont({
  src: [
    { path: "../public/fonts/general-400.woff2", weight: "400" },
    { path: "../public/fonts/general-500.woff2", weight: "500" },
    { path: "../public/fonts/general-600.woff2", weight: "600" },
    { path: "../public/fonts/general-700.woff2", weight: "700" },
  ],
  variable: "--font-general",
  display: "swap",
});
const recoleta = localFont({
  src: "../public/fonts/recoleta.ttf",
  variable: "--font-recoleta",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Nilgün Oygur - Kişisel Yolculuğunuza Başlayın",
    template: "%s | Nilgün Oygur",
  },
  description:
    "Nilgün Oygur ile kendinizi keşfetme yolculuğuna çıkın. Kitaplar, eğitimler, bireysel seanslar ve kişisel gelişim yazıları.",
  metadataBase: new URL(config().siteUrl),
  openGraph: {
    locale: "tr_TR",
    type: "website",
    siteName: "Nilgün Oygur",
    images: ["/images/iepM9ikg64bhWu8ixRgbXL2bzM.webp"],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const banner = await getPublishedBanner();
  return (
    <html
      data-scroll-behavior="smooth"
      lang="tr"
      className={`${general.variable} ${recoleta.variable}`}
    >
      <body style={banner ? ({ "--announcement-offset": "38px" } as React.CSSProperties) : undefined}>
        <a className="fixed top-0 left-5 z-100 -translate-y-[150%] rounded-[10px] bg-white p-3 focus:translate-y-0" href="#main">
          İçeriğe geç
        </a>
        <MotionProvider>
          {banner && <AnnouncementBar config={banner} />}
          <Header />
          <main id="main" className="pt-[var(--announcement-offset,0px)]">{children}</main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
