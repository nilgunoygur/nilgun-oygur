type MuxTrack = { id: string; type: "video" | "audio" | "text"; status?: string };
export type MuxAsset = {
  id: string; status: "preparing" | "ready" | "errored"; created_at: string; duration?: number; aspect_ratio?: string;
  meta?: { title?: string }; playback_ids?: { id: string; policy: "public" | "signed" | "drm" }[]; tracks?: MuxTrack[];
};
export type CaptionState = "ready" | "preparing" | "failed" | "none";

export const captionLanguage = { language_code: "tr", name: "Türkçe (otomatik)" } as const;

/** Audio lessons show no captions, so they are not transcribed. */
export const newAssetSettings = (lesson: { id: string; title: string; kind: "video" | "audio" | "live" }) => ({
  playback_policies: ["signed"], video_quality: "basic", passthrough: lesson.id,
  meta: { title: lesson.title.slice(0, 512), external_id: lesson.id },
  ...(lesson.kind !== "audio" && { inputs: [{ generated_subtitles: [captionLanguage] }] }),
});

export function describeAsset(asset: MuxAsset) {
  const text = asset.tracks?.filter(track => track.type === "text") ?? [];
  const has = (status: string) => text.some(track => track.status === status);
  const captions: CaptionState = has("ready") ? "ready" : has("preparing") ? "preparing" : has("errored") ? "failed" : "none";
  const title = asset.meta?.title?.trim() || undefined;
  const audioOnly = !!asset.tracks?.length && !asset.tracks.some(track => track.type === "video");
  return {
    id: asset.id,
    title,
    label: title ?? `${audioOnly ? "Ses kaydı" : "Video"} · ${new Date(Number(asset.created_at) * 1000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
    // Mux makes an audio-only asset from a file without a picture.
    audioOnly,
    ready: asset.status === "ready",
    failed: asset.status === "errored",
    durationSeconds: Math.ceil(asset.duration ?? 0),
    aspectRatio: asset.aspect_ratio,
    signedPlaybackId: asset.playback_ids?.find(p => p.policy === "signed")?.id,
    publicPlaybackIds: asset.playback_ids?.filter(p => p.policy === "public").map(p => p.id) ?? [],
    audioTrackId: asset.tracks?.find(track => track.type === "audio" && track.status !== "errored")?.id,
    captions,
  };
}
export type AssetInfo = ReturnType<typeof describeAsset>;
