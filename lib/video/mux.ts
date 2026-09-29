import "server-only";
import { signPlaybackTokens } from "./playback-token";
import { config } from "@/lib/config";
import { describeAsset, type CaptionState, type MuxAsset } from "./library";

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

export function playbackTokens(playbackId: string, expiresAt: number) {
  const v = config().video;
  if (!v.signingKeyId || !v.signingPrivateKey) throw new Error("Video hizmeti henüz bağlanmadı.");
  return signPlaybackTokens(playbackId, expiresAt, v.signingKeyId, v.signingPrivateKey);
}

export type AttachedVideo = { title?: string; captions?: CaptionState; thumbnail: string };

/** Mux title, caption state and a signed thumbnail for the videos on a course's lessons, keyed by Mux asset ID. */
export async function attachedVideos(videos: { assetId: string; playbackId: string }[]): Promise<Record<string, AttachedVideo>> {
  if (!videos.length || !videoConfigured()) return {};
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const entries = await Promise.all(videos.map(async ({ assetId, playbackId }) => {
    const thumbnail = `https://image.mux.com/${playbackId}/thumbnail.webp?width=320&token=${playbackTokens(playbackId, expires).thumbnail}`;
    // The card still shows the thumbnail when Mux is briefly unreachable.
    const asset = await muxRequest<MuxAsset>(`assets/${encodeURIComponent(assetId)}`).then(describeAsset, () => undefined);
    return [assetId, { title: asset?.title, captions: asset?.captions, thumbnail }] as const;
  }));
  return Object.fromEntries(entries);
}
