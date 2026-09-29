import "server-only";
import { signPlaybackToken, signPlaybackTokens } from "./playback-token";
import { config } from "@/lib/config";
import { describeAsset, type CaptionState, type MuxAsset } from "./library";
import type { videoAssets } from "@/lib/db/schema";

type VideoAsset = typeof videoAssets.$inferSelect;

export function videoConfigured() {
  const v = config().video;
  return !!(v.tokenId && v.tokenSecret && v.signingKeyId && v.signingPrivateKey);
}

export async function muxRequest<T>(path: string, body?: unknown, method: "GET" | "POST" | "PATCH" | "DELETE" = body === undefined ? "GET" : "POST"): Promise<T> {
  const v = config().video;
  if (!v.tokenId || !v.tokenSecret) throw new Error("Video hizmeti henüz bağlanmadı.");
  const response = await fetch(`https://api.mux.com/video/v1/${path}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Basic ${Buffer.from(`${v.tokenId}:${v.tokenSecret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error("Video hizmetine ulaşılamadı. Lütfen yeniden deneyin.");
  if (response.status === 204) return undefined as T;
  return (await response.json()).data as T;
}

function signingKey() {
  const v = config().video;
  if (!v.signingKeyId || !v.signingPrivateKey) throw new Error("Video hizmeti henüz bağlanmadı.");
  return [v.signingKeyId, v.signingPrivateKey] as const;
}

export const playbackTokens = (playbackId: string, expiresAt: number) => signPlaybackTokens(playbackId, expiresAt, ...signingKey());
export const ownerTokenExpiry = () => Math.floor(Date.now() / 1000) + 3600;
export const thumbnailUrl = (playbackId: string, signed = true) =>
  `https://image.mux.com/${playbackId}/thumbnail.webp?width=320${signed ? `&token=${signPlaybackToken(playbackId, "t", ownerTokenExpiry(), ...signingKey())}` : ""}`;
export const muxLibrary = async () => (await muxRequest<MuxAsset[]>("assets?limit=100")).map(describeAsset);

export type AttachedVideo = { title?: string; captions?: CaptionState; thumbnail: string };

/** One Mux list call for every video on the page; on failure the cards still get thumbnails. */
export async function attachedVideos(assets: (VideoAsset | null)[]): Promise<Record<string, AttachedVideo>> {
  const ready = assets.filter((asset): asset is VideoAsset & { muxAssetId: string; signedPlaybackId: string } => asset?.status === "ready" && !!asset.muxAssetId && !!asset.signedPlaybackId);
  if (!ready.length || !videoConfigured()) return {};
  const library = new Map((await muxLibrary().catch(() => [])).map(asset => [asset.id, asset]));
  return Object.fromEntries(ready.map(asset => {
    const info = library.get(asset.muxAssetId);
    return [asset.muxAssetId, { title: info?.title, captions: info?.captions, thumbnail: thumbnailUrl(asset.signedPlaybackId) }];
  }));
}
