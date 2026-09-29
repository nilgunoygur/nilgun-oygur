import "server-only";
import { signPlaybackTokens } from "./playback-token";
import { config } from "@/lib/config";

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
