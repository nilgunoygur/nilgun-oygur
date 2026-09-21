import { parsePriceKurus } from "./api.ts";

// Course details come from the product page's Open Graph tags; the product API is 403 for this account.
export type ShopierProductDetails = {
  title: string;
  description: string;
  imageUrl: string | null;
  priceKurus: number;
  compareAtPriceKurus: number | null;
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

export const isShopierImageUrl = (url: string) => /^https:\/\/cdn\.shopier\.app\/[\w./-]+$/.test(url);

export function parseShopierProductPage(html: string): ShopierProductDetails | null {
  const title = meta(html, "og:title");
  const price = meta(html, "product:price:amount");
  const priceKurus = price ? parsePriceKurus(price) : null;
  if (!title || priceKurus === null || priceKurus <= 0) return null;
  const image = meta(html, "og:image");
  const oldPrice = /class="product-price-old[^"]*"[^>]*data-price="([^"]+)"/.exec(html)?.[1];
  const compareAt = oldPrice ? parsePriceKurus(decode(oldPrice)) : null;
  return {
    title,
    description: meta(html, "og:description") ?? "",
    imageUrl: image && isShopierImageUrl(image) ? image : null,
    priceKurus,
    compareAtPriceKurus: compareAt && compareAt > priceKurus ? compareAt : null,
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
  return parseShopierProductPage(await response.text());
}
