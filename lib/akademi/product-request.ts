import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { privateNoStore } from "@/lib/auth/viewer";
import { filesConfigured, signedFileUrl, storeFile } from "@/lib/files/storage";
import { ShopierError } from "@/lib/shopier/api";
import { publicOrigin } from "@/lib/site";
import { fallbackCover } from "./catalog";
import { OwnerInputError } from "./owner-commands";
import { coverRules } from "./owner-forms";

// Shared by the routes that create and edit a course's Shopier product: a multipart body with the
// form values as JSON in `data` and an optional cover in `image`.

export const kurus = (lira: number) => Math.round(lira * 100);
/** Used when a new course has no cover of its own; Shopier needs one image to create a product. */
export const defaultCover = `${publicOrigin}${fallbackCover}`;

export const refuse = (error: string, status = 400) => Response.json({ error }, { status, headers: privateNoStore });

function coverType(bytes: Uint8Array) {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: "image/jpeg", extension: "jpg" };
  return null;
}

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

/** Shopier downloads product images itself: keeps the cover privately and returns a link that works for a day. */
export async function shareCover(image: File) {
  const bytes = Buffer.from(await image.arrayBuffer()), type = coverType(bytes);
  if (!type) throw new OwnerInputError(`Kapak görseli okunamadı. ${coverRules.hint}`);
  const pathname = `covers/${randomUUID()}.${type.extension}`;
  await storeFile(pathname, bytes, type.mime);
  return { pathname, url: await signedFileUrl(pathname, Date.now() + 24 * 3600_000) };
}

export function productFailure(error: unknown) {
  if (error instanceof OwnerInputError) return refuse(error.message);
  if (error instanceof ShopierError) return refuse(`Shopier değişikliği kabul etmedi (${error.status}).${error.detail ? ` ${error.detail}` : ""}`, 502);
  return refuse("Değişiklik kaydedilemedi. Shopier ile eşitleyip yeniden deneyin.", 500);
}
