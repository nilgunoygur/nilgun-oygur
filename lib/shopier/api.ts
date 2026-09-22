import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Shopier REST client; the server-only index.ts supplies the token.
const API = "https://api.shopier.com/v1";

const email = z.string().trim().toLowerCase().pipe(z.email());
const party = z.object({ email: z.string().optional().nullable() }).partial().nullable().optional();
export const shopierOrderSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  paymentStatus: z.string(),
  dateCreated: z.string().transform((value, ctx) => {
    const date = new Date(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
    if (Number.isNaN(date.getTime())) { ctx.addIssue({ code: "custom", message: "Invalid order date" }); return z.NEVER; }
    return date;
  }),
  currency: z.string(),
  shippingInfo: party,
  billingInfo: party,
  lineItems: z.array(z.object({
    productId: z.union([z.string(), z.number()]).transform(String),
    title: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    total: z.string(),
  })).min(1),
});
export type ShopierOrder = z.output<typeof shopierOrderSchema>;

const id = z.union([z.string(), z.number()]).transform(String);
export const shopierProductSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().nullish().transform(value => value ?? ""),
  type: z.string(),
  customListing: z.boolean().nullish(),
  media: z.array(z.object({ url: z.string(), placement: z.coerce.number().optional() })).nullish(),
  priceData: z.object({
    currency: z.string(),
    price: z.string(),
    discount: z.boolean().nullish(),
    discountedPrice: z.string().nullish(),
  }),
  stockStatus: z.string().nullish(),
});
export type ShopierProduct = z.output<typeof shopierProductSchema>;

export type ShopierProductDetails = {
  title: string;
  description: string;
  imageUrl: string | null;
  priceKurus: number;
  compareAtPriceKurus: number | null;
  currency: string;
};

/** Sale price, pre-discount price and primary image of a product. */
export function productDetails(product: ShopierProduct): ShopierProductDetails | null {
  const regular = parsePriceKurus(product.priceData.price);
  const sale = product.priceData.discount && product.priceData.discountedPrice ? parsePriceKurus(product.priceData.discountedPrice) : null;
  const priceKurus = sale ?? regular;
  if (!priceKurus || priceKurus <= 0) return null;
  const image = [...(product.media ?? [])].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))[0]?.url;
  return {
    title: product.title,
    description: product.description,
    imageUrl: image && /^https:\/\/cdn\.shopier\.app\/[\w./-]+$/.test(image) ? image : null,
    priceKurus,
    compareAtPriceKurus: sale && regular && regular > sale ? regular : null,
    currency: product.priceData.currency,
  };
}

/** Visible, in-stock digital products are Akademi courses. */
export const isCourseProduct = (product: ShopierProduct) =>
  product.type === "digital" && !product.customListing && product.stockStatus !== "outOfStock";

/** The email the buyer typed at Shopier checkout, normalized; billing wins over shipping. */
export function buyerEmail(order: ShopierOrder): string | null {
  for (const candidate of [order.billingInfo?.email, order.shippingInfo?.email]) {
    const parsed = email.safeParse(candidate ?? "");
    if (parsed.success) return parsed.data;
  }
  return null;
}

/** "950", "2490.50", "2.490,50 TL" → kuruş. */
export function parsePriceKurus(value: string): number | null {
  let normalized = value.replace(/\s|TL|₺/g, "");
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [lira, kurus = ""] = normalized.split(".");
  return Number(lira) * 100 + Number(kurus.padEnd(2, "0"));
}

export function toKurus(amount: string): number {
  const kurus = parsePriceKurus(amount);
  if (kurus === null) throw new Error("Invalid Shopier amount.");
  return kurus;
}

/** Shopier-Signature = hex HMAC-SHA256(raw body, webhook token). */
export function isValidWebhookSignature(rawBody: string, signature: string | null, token: string): boolean {
  if (!signature || !token) return false;
  const expected = createHmac("sha256", token).update(rawBody, "utf8").digest("hex");
  const given = signature.trim().toLowerCase();
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

class ShopierError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function createShopierClient(token: string, fetcher: typeof fetch = fetch) {
  if (!token) throw new Error("Shopier API token is not configured.");
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(API + path, {
      ...init,
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ShopierError(response.status, `Shopier ${init.method ?? "GET"} ${path.split("?")[0]} failed with ${response.status}.`);
    return response.json() as Promise<T>;
  }
  return {
    async getOrder(id: string) {
      if (!/^\d{1,20}$/.test(id)) return null;
      try {
        return shopierOrderSchema.parse(await call(`/orders/${id}`));
      } catch (error) {
        if (error instanceof ShopierError && (error.status === 404 || error.status === 400)) return null;
        throw error;
      }
    },
    async listOrdersSince(since: Date, maxPages = 10) {
      const orders: ShopierOrder[] = [];
      const dateStart = encodeURIComponent(since.toISOString().replace(/\.\d{3}Z$/, "+0000"));
      for (let page = 1; page <= maxPages; page++) {
        const batch = z.array(z.unknown()).parse(await call(`/orders?dateStart=${dateStart}&limit=50&page=${page}`));
        for (const raw of batch) {
          const parsed = shopierOrderSchema.safeParse(raw);
          if (parsed.success) orders.push(parsed.data);
        }
        if (batch.length < 50) break;
      }
      return orders;
    },
    async getProduct(id: string) {
      if (!/^\d{1,20}$/.test(id)) return null;
      try {
        return shopierProductSchema.parse(await call(`/products/${id}`));
      } catch (error) {
        if (error instanceof ShopierError && (error.status === 404 || error.status === 400)) return null;
        throw error;
      }
    },
    /** Every product (hidden ones included). `ids` also covers products that failed validation. */
    async listProducts(maxPages = 20) {
      const products: ShopierProduct[] = [];
      const ids = new Set<string>();
      for (let page = 1; page <= maxPages; page++) {
        const batch = z.array(z.object({ id }).loose()).parse(await call(`/products?limit=50&page=${page}`));
        for (const raw of batch) {
          ids.add(raw.id);
          const parsed = shopierProductSchema.safeParse(raw);
          if (parsed.success) products.push(parsed.data);
        }
        if (batch.length < 50) return { products, ids };
      }
      throw new Error("Shopier product list exceeded the page limit.");
    },
    listWebhooks: () => call<{ id: string; event: string; url: string }[]>("/webhooks"),
    /** The signing token is returned only in this response. */
    createWebhook: (event: string, url: string) => call<{ id: string; event: string; url: string; token: string }>("/webhooks", { method: "POST", body: JSON.stringify({ event, url }) }),
  };
}

/** Accepts a bare product id or a shopier.com product link. */
export function parseShopierProduct(input: string): { id: string; url: string } | null {
  const value = input.trim();
  const match = /^(\d{4,20})$/.exec(value) ?? /^https:\/\/(?:www\.)?shopier\.com\/(?:ShowProductNew\/products\.php\?id=)?(\d{4,20})\/?(?:[?#].*)?$/.exec(value);
  return match ? { id: match[1], url: `https://www.shopier.com/${match[1]}` } : null;
}
