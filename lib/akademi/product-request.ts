import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { privateNoStore } from "@/lib/auth/viewer";
import { imageMime } from "@/lib/files/image-type";
import { deleteStoredFiles, filesConfigured, signedFileUrl, storeFile } from "@/lib/files/storage";
import { productDetails, ShopierError, type ShopierProduct } from "@/lib/shopier/api";
import { OwnerInputError } from "./owner-commands";
import { coverRules } from "./owner-forms";

// For the routes that create and edit a course's Shopier product. Body: the form values as JSON in `data`, an optional cover in `image`.

export const kurus = (lira: number) => Math.round(lira * 100);
export const refuse = (error: string, status = 400) => Response.json({ error }, { status, headers: privateNoStore });

export async function readProductForm<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.output<S>; image: File | null } | Response> {
  const body = await request.formData().catch(() => null);
  let raw: unknown = null;
  try { raw = JSON.parse(String(body?.get("data") ?? "")); } catch { /* reported below */ }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return refuse(parsed.error.issues[0]?.message ?? "Geçersiz istek.");
  const image = body?.get("image");
  if (!(image instanceof File) || image.size === 0) return { data: parsed.data, image: null };
  if (image.size > coverRules.maxBytes) return refuse(`Kapak görseli çok büyük. ${coverRules.hint}`);
  if (!filesConfigured()) return refuse("Kapak görseli yüklemek için dosya depolama bağlantısının kurulması gerekiyor.");
  return { data: parsed.data, image };
}

/** Shopier downloads product images itself, so it gets a link signed for a day. */
export async function shareCover(image: File) {
  const bytes = Buffer.from(await image.arrayBuffer()), mime = imageMime(bytes);
  if (!mime || !coverRules.types.includes(mime)) throw new OwnerInputError(`Kapak görseli okunamadı. ${coverRules.hint}`);
  const pathname = `covers/${randomUUID()}.${mime === "image/png" ? "png" : "jpg"}`;
  await storeFile(pathname, bytes, mime);
  return { pathname, url: await signedFileUrl(pathname, Date.now() + 24 * 3600_000) };
}

/** Once Shopier has copied the cover to its own CDN, ours is no longer needed. */
export async function releaseCover(cover: { pathname: string } | null, product: ShopierProduct) {
  if (cover && productDetails(product)?.imageUrl) await deleteStoredFiles([cover.pathname]);
}

export function productFailure(error: unknown) {
  if (error instanceof OwnerInputError) return refuse(error.message);
  if (error instanceof ShopierError) return refuse(`Shopier değişikliği kabul etmedi (${error.status}).${error.detail ? ` ${error.detail}` : ""}`, 502);
  return refuse("Değişiklik kaydedilemedi. Shopier ile eşitleyip yeniden deneyin.", 500);
}
