import { parsePriceKurus, type ShopierProduct } from "./api.ts";

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

const isShopierImageUrl = (url: string) => /^https:\/\/cdn\.shopier\.app\/[\w./-]+$/.test(url);

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

/** Maps a webhook Product model to the same shape the product page yields. */
export function productDetailsFromModel(product: ShopierProduct): ShopierProductDetails | null {
  const regular = parsePriceKurus(product.priceData.price);
  const sale = product.priceData.discount && product.priceData.discountedPrice ? parsePriceKurus(product.priceData.discountedPrice) : null;
  const priceKurus = sale ?? regular;
  if (!priceKurus || priceKurus <= 0) return null;
  const image = [...(product.media ?? [])].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))[0]?.url;
  return {
    title: product.title,
    description: product.description,
    imageUrl: image && isShopierImageUrl(image) ? image : null,
    priceKurus,
    compareAtPriceKurus: sale && regular && regular > sale ? regular : null,
    currency: product.priceData.currency,
  };
}

export type ProductLookup = { status: "found"; product: ShopierProductDetails } | { status: "gone" } | { status: "error" };

const getPage = (url: string, fetcher: typeof fetch) => fetcher(url, {
  headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; NilgunOygurAkademi/1.0)" },
  cache: "no-store",
  signal: AbortSignal.timeout(10_000),
});

/** Deleted products redirect to the store or a not-found page; only that counts as "gone". */
export async function fetchShopierProduct(productId: string, fetcher: typeof fetch = fetch): Promise<ProductLookup> {
  if (!/^\d{4,20}$/.test(productId)) return { status: "gone" };
  const response = await getPage(`https://www.shopier.com/${productId}`, fetcher).catch(() => null);
  if (!response?.ok) return { status: "error" };
  if (response.redirected && !new URL(response.url).pathname.endsWith(`/${productId}`)) return { status: "gone" };
  const product = parseShopierProductPage(await response.text());
  return product ? { status: "found", product } : { status: "error" };
}

export type StoreListing = { id: string; digital: boolean };

export function parseShopierStorePage(html: string): StoreListing[] {
  const listings: StoreListing[] = [];
  for (const card of html.split(/<div class="product-card[ "]/).slice(1)) {
    const id = /data-back-id="(\d{4,20})"/.exec(card)?.[1];
    if (id && !listings.some(listing => listing.id === id)) listings.push({ id, digital: /<span class="badge">\s*Dijital ürün\s*<\/span>/.test(card) });
  }
  return listings;
}

/** Visible products on the public store page; throws when the page cannot be read. */
export async function fetchShopierStoreProducts(store: string, fetcher: typeof fetch = fetch): Promise<StoreListing[]> {
  if (!/^[\w-]{2,60}$/.test(store)) throw new Error("Invalid Shopier store name.");
  const response = await getPage(`https://www.shopier.com/${store}`, fetcher);
  const html = response.ok ? await response.text() : "";
  if (!html.includes("shopier--product-list-section")) throw new Error("Shopier store page could not be read.");
  return parseShopierStorePage(html);
}
