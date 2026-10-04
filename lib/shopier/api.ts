import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Shopier REST adapter; the server-only index.ts supplies the token. Caching belongs to the Catalog module.
const API = "https://api.shopier.com/v1";

const email = z.string().trim().toLowerCase().pipe(z.email());
// Best effort: odd buyer values become undefined and never reject an order.
const loose = z.unknown().transform(value => typeof value === "string" || typeof value === "number" ? String(value) : undefined);
const party = z.object({
  email: z.string().optional().nullable(), phone: loose, address: loose, district: loose, city: loose, postcode: loose,
}).partial().nullable().optional();
const shopierDate = z.string().transform((value, ctx) => {
  const date = new Date(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(date.getTime())) { ctx.addIssue({ code: "custom", message: "Invalid Shopier date" }); return z.NEVER; }
  return date;
});
export const shopierOrderSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  paymentStatus: z.string(),
  dateCreated: shopierDate,
  currency: z.string(),
  totals: z.object({ total: z.string() }).optional(),
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
export const shopierRefundSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  orderId: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(["pending", "failed", "succeeded"]),
  type: z.enum(["full", "partial"]),
  dateCreated: shopierDate,
  dateRefunded: shopierDate.nullish(),
  currency: z.string(),
  total: z.string(),
});
export type ShopierRefund = z.output<typeof shopierRefundSchema>;

const id = z.union([z.string(), z.number()]).transform(String);
export const shopierProductSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().nullish().transform(value => value ?? ""),
  type: z.string(),
  customListing: z.boolean().nullish(),
  url: z.string().nullish(),
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

/** A missing key is left as it is on Shopier. */
export type ProductChanges = {
  title?: string;
  /** HTML. */
  description?: string;
  /** Sent with the discount: Shopier drops the discount when a price arrives alone and refuses a discount without a price. */
  priceKurus?: number;
  /** null means no discount. */
  discountedPriceKurus?: number | null;
  /** A JPG/PNG Shopier can download; replaces the product's images. */
  imageUrl?: string;
  /** Shopier's "custom listing": reachable by link only. */
  hidden?: boolean;
  inStock?: boolean;
};
export type NewProduct = Required<Pick<ProductChanges, "title" | "description" | "priceKurus" | "imageUrl">> & Pick<ProductChanges, "discountedPriceKurus" | "hidden">;
/** Digital products have no real stock; this is what the Shopier panel sets. */
const digitalStock = 10_000;
const validPrice = (kurus: number) => Number.isSafeInteger(kurus) && kurus >= 100 && kurus <= 1_000_000_000;
const amount = (kurus: number) => (kurus / 100).toFixed(2);

function productBody(changes: ProductChanges) {
  for (const price of [changes.priceKurus, changes.discountedPriceKurus]) if (price != null && !validPrice(price)) throw new Error("Invalid Shopier product price.");
  if ((changes.priceKurus === undefined) !== (changes.discountedPriceKurus === undefined)) throw new Error("Shopier needs the price and the discount together.");
  const priceData = changes.priceKurus === undefined ? undefined : {
    price: amount(changes.priceKurus),
    ...(changes.discountedPriceKurus == null ? { discount: false } : { discount: true, discountedPrice: amount(changes.discountedPriceKurus) }),
  };
  return {
    ...(changes.title !== undefined && { title: changes.title.trim() }),
    ...(changes.description !== undefined && { description: changes.description }),
    ...(priceData && { priceData }),
    ...(changes.imageUrl !== undefined && { media: [{ type: "image", url: changes.imageUrl, placement: 1 }] }),
    ...(changes.hidden !== undefined && { customListing: changes.hidden }),
    ...(changes.inStock !== undefined && { stockQuantity: changes.inStock ? digitalStock : 0 }),
  };
}

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

/** The products the owner can edit from the site. */
export const isEditableProduct = (product: ShopierProduct) => product.type === "digital" && product.priceData.currency === "TRY";

/** Why a product is not an Akademi course, or null for an in-stock digital product. */
export const courseProductBlocker = (product: ShopierProduct) => product.type !== "digital" ? "notDigital" as const : product.stockStatus === "outOfStock" ? "outOfStock" as const : null;

/** Use the Catalog module's rule, not this alone. */
export const isCourseProduct = (product: ShopierProduct) => !courseProductBlocker(product);

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

export class ShopierError extends Error {
  readonly status: number;
  /** The start of Shopier's response body, for the owner to read when a write is refused. */
  readonly detail: string;
  constructor(status: number, message: string, detail = "") { super(message); this.status = status; this.detail = detail; }
}

export type ShopierClient = ReturnType<typeof createShopierClient>;

export function createShopierClient(token: string, fetcher: typeof fetch = fetch) {
  if (!token) throw new Error("Shopier API token is not configured.");
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetcher(API + path, {
        ...init,
        headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      // 200 requests per minute per token: wait once when Shopier asks for a short pause, then give up.
      const wait = Number(response.headers.get("retry-after"));
      if (response.status === 429 && attempt === 0 && wait > 0 && wait <= 5) {
        await new Promise(resolve => setTimeout(resolve, wait * 1000));
        continue;
      }
      if (!response.ok) throw new ShopierError(response.status, `Shopier ${init.method ?? "GET"} ${path.split("?")[0]} failed with ${response.status}.`, (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300));
      return response.json() as Promise<T>;
    }
  }
  // Shopier returns HTTP 500 for refund date filters, so read every page; never truncate.
  async function listSucceededRefunds(maxPages = 20) {
    const refunds: ShopierRefund[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = z.array(shopierRefundSchema).parse(await call(`/refunds?limit=50&page=${page}&sort=dateDesc&status=succeeded`));
      refunds.push(...batch.filter(refund => refund.status === "succeeded"));
      if (batch.length < 50) return refunds;
    }
    throw new Error("Shopier refund list exceeded the page limit.");
  }
  return {
    listSucceededRefunds,
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
    async listRecentTransactions(start: Date, end: Date) {
      const query = new URLSearchParams({
        dateStart: start.toISOString().replace(/\.\d{3}Z$/, "+0000"),
        dateEnd: new Date(end.getTime() - 1).toISOString().replace(/\.\d{3}Z$/, "+0000"),
        limit: "50",
        page: "1",
        sort: "dateDesc",
      });
      const [rawOrders, refundResult] = await Promise.all([
        call<unknown>(`/orders?${query}`),
        listSucceededRefunds().then(
          all => ({ refunds: all.filter(refund => (refund.dateRefunded ?? refund.dateCreated) >= start && (refund.dateRefunded ?? refund.dateCreated) < end), unavailable: false }),
          () => ({ refunds: [] as ShopierRefund[], unavailable: true })),
      ]);
      return {
        orders: z.array(shopierOrderSchema).parse(rawOrders),
        ...refundResult,
      };
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
    /** Shopier downloads the image itself, so `imageUrl` must be publicly reachable. */
    async createProduct(product: NewProduct) {
      const body = productBody({ ...product, discountedPriceKurus: product.discountedPriceKurus ?? null });
      return shopierProductSchema.parse(await call("/products", {
        method: "POST",
        body: JSON.stringify({ ...body, type: "digital", priceData: { currency: "TRY", ...body.priceData }, shippingPayer: "sellerPays", stockQuantity: digitalStock }),
      }));
    },
    async updateProduct(id: string, changes: ProductChanges) {
      if (!/^\d{1,20}$/.test(id)) throw new Error("Invalid Shopier product.");
      return shopierProductSchema.parse(await call(`/products/${id}`, { method: "PUT", body: JSON.stringify(productBody(changes)) }));
    },
    /** Every product (hidden ones included). `ids` also covers products that failed validation. */
    async listProducts({ maxPages = 20 } = {}) {
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
