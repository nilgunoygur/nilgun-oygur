import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { AnnouncementBar } from "@/components/announcement-bar";
import { announcements } from "@/lib/announcements";
import { Footer } from "@/components/site";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    locale: "tr_TR",
    type: "website",
    siteName: "Nilgün Oygur",
    images: ["/images/iepM9ikg64bhWu8ixRgbXL2bzM.webp"],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="tr"
      className={`${general.variable} ${recoleta.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        <AnnouncementBar items={announcements} />
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
