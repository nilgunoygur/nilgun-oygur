// Pure helpers for Mux asset payloads; the owner actions in app/yonetim do the network calls.

export type MuxTrack = { id: string; type: "video" | "audio" | "text"; status?: string; text_source?: string; language_code?: string };
export type MuxAsset = {
  id: string; status: "preparing" | "ready" | "errored"; created_at: string; duration?: number; aspect_ratio?: string;
  passthrough?: string; meta?: { title?: string; external_id?: string };
  playback_ids?: { id: string; policy: "public" | "signed" | "drm" }[]; tracks?: MuxTrack[];
};

export const captionLanguage = { language_code: "tr", name: "Türkçe (otomatik)" } as const;

/** Settings every lesson video gets: signed playback only, Turkish auto-captions, and a readable title in the Mux dashboard. */
export function newAssetSettings(lesson: { id: string; title: string }) {
  return {
    playback_policies: ["signed"], video_quality: "basic", passthrough: lesson.id,
    meta: { title: lesson.title.slice(0, 512), external_id: lesson.id },
    inputs: [{ generated_subtitles: [captionLanguage] }],
  };
}

export type CaptionState = "ready" | "preparing" | "failed" | "none";

export function describeAsset(asset: MuxAsset) {
  const text = asset.tracks?.filter(track => track.type === "text") ?? [];
  const captions: CaptionState = text.some(track => track.status === "ready") ? "ready"
    : text.some(track => track.status === "preparing") ? "preparing"
    : text.some(track => track.status === "errored") ? "failed" : "none";
  return {
    id: asset.id,
    title: asset.meta?.title?.trim() || `Video · ${new Date(Number(asset.created_at) * 1000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
    ready: asset.status === "ready",
    durationSeconds: Math.ceil(asset.duration ?? 0),
    aspectRatio: asset.aspect_ratio,
    createdAt: Number(asset.created_at) * 1000,
    signedPlaybackId: asset.playback_ids?.find(p => p.policy === "signed")?.id,
    publicPlaybackIds: asset.playback_ids?.filter(p => p.policy === "public").map(p => p.id) ?? [],
    audioTrackId: asset.tracks?.find(track => track.type === "audio" && track.status !== "errored")?.id,
    captions,
  };
}
