// Shopier's product API is forbidden for this account, but every product page (hidden ones
// included) publishes Open Graph tags. Those are the source of truth for course details.
export type ShopierProductDetails = {
  title: string;
  description: string;
  imageUrl: string | null;
  priceKurus: number;
  currency: string;
};

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (value: string) => value
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
  .trim();

function meta(html: string, property: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (key?.toLowerCase() !== property) continue;
    const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
    if (content) return decode(content[1] ?? content[2] ?? "");
  }
  return null;
}

/** "950", "2490.50", "2.490,50" → kuruş. */
export function parsePriceKurus(value: string): number | null {
  let normalized = value.replace(/\s|TL|₺/g, "");
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [lira, kurus = ""] = normalized.split(".");
  return Number(lira) * 100 + Number(kurus.padEnd(2, "0"));
}

export function parseShopierProductPage(html: string): ShopierProductDetails | null {
  const title = meta(html, "og:title");
  const price = meta(html, "product:price:amount");
  const priceKurus = price ? parsePriceKurus(price) : null;
  if (!title || priceKurus === null || priceKurus <= 0) return null;
  const image = meta(html, "og:image");
  return {
    title,
    description: meta(html, "og:description") ?? "",
    imageUrl: image && /^https:\/\/cdn\.shopier\.app\//.test(image) ? image : null,
    priceKurus,
    currency: meta(html, "product:price:currency") ?? "TRY",
  };
}

export async function fetchShopierProduct(productId: string, fetcher: typeof fetch = fetch): Promise<ShopierProductDetails | null> {
  if (!/^\d{4,20}$/.test(productId)) return null;
  const response = await fetcher(`https://www.shopier.com/${productId}`, {
    headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; NilgunOygurAkademi/1.0)" },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  // A missing product redirects to the store or an error page without product tags.
  return parseShopierProductPage(await response.text());
}
