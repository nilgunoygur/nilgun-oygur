export type Announcement = { text: string; href?: string };

// Sliding banner at the top of every page; an empty list hides it.
export const announcements: Announcement[] = [
  { text: "Nilgün Oygur Akademi açıldı: online eğitimleri keşfedin", href: "/akademi" },
  { text: "Ödemeler Shopier güvencesiyle", href: "/akademi#egitimler" },
  { text: "Satın aldığınız eğitimlere hesabınızdan ulaşın", href: "/akademi/giris" },
];
