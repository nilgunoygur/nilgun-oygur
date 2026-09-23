export type Announcement = { text: string; href?: string };
export type BannerConfig = {
  items: Announcement[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  animation: "scroll" | "fade" | "static";
  speedSeconds: number;
  loop: boolean;
  pauseOnHover: boolean;
  direction: "left" | "right";
  separator: string;
};

export const defaultBanner: BannerConfig = {
  items: [
    { text: "Nilgün Oygur Akademi açıldı: online eğitimleri keşfedin", href: "/akademi" },
    { text: "Ödemeler Shopier güvencesiyle", href: "/akademi#egitimler" },
    { text: "Satın aldığınız eğitimlere hesabınızdan ulaşın", href: "/akademi/giris" },
  ],
  backgroundColor: "#224c40",
  textColor: "#f1f5e9",
  accentColor: "#d8ef9f",
  animation: "scroll",
  speedSeconds: 7,
  loop: true,
  pauseOnHover: true,
  direction: "left",
  separator: "✦",
};
