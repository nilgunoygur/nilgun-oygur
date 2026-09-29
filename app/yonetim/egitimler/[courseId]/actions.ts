"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, lessons, videoAssets } from "@/lib/db/schema";
import { attachVideo, createLessons, reorderLessons, updateLesson } from "@/lib/akademi/lesson-editor";
import type { lessonInput } from "@/lib/akademi/owner-forms";
import { muxLibrary, muxRequest, ownerTokenExpiry, playbackTokens, thumbnailUrl, videoConfigured } from "@/lib/video/mux";
import { captionLanguage, describeAsset, newAssetSettings, type AssetInfo, type MuxAsset } from "@/lib/video/library";
import { config } from "@/lib/config";
import type { FormState } from "@/components/akademi/form-status";

const errorMessage = (error: unknown) => error instanceof z.ZodError ? "Lütfen ders alanlarını kontrol edin: " + error.issues[0]?.message : error instanceof Error && !["UNAUTHORIZED", "FORBIDDEN"].includes(error.message) && !error.message.includes("query") ? error.message : "İşlem tamamlanamadı. Yönetim oturumunuzu kontrol edin.";
const report = (error: unknown): FormState => ({ status: "error", message: errorMessage(error) });
function changed(courseId: string) {
  revalidatePath(`/yonetim/egitimler/${courseId}`);
  revalidatePath(`/akademi/hesabim/${courseId}`);
  revalidatePath("/akademi/hesabim");
}
export async function addLessons(_: FormState, form: FormData): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const courseId = z.uuid().parse(form.get("courseId"));
    await createLessons(getDatabase(), viewer.user.id, courseId, z.enum(["video", "live", "template"]).parse(form.get("kind")));
    changed(courseId);
    return { status: "success", message: "Taslak dersler eklendi. İçerikleri hazırlayıp yayınlayabilirsiniz." };
  } catch (error) { return report(error); }
}
export async function saveLesson(values: z.input<typeof lessonInput>): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const input = await updateLesson(getDatabase(), viewer.user.id, values);
    changed(input.courseId);
    return { status: "success", message: input.status === "published" ? "Ders öğrencilerinize açıldı." : "Taslak kaydedildi." };
  } catch (error) { return report(error); }
}
export async function saveLessonOrder(courseId: string, lessonIds: string[]): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const id = z.uuid().parse(courseId);
    await reorderLessons(getDatabase(), viewer.user.id, id, z.array(z.uuid()).max(1000).parse(lessonIds));
    changed(id);
    return { status: "success", message: "Ders sırası kaydedildi." };
  } catch (error) { return report(error); }
}
export async function startUpload(lessonId: string) {
  const viewer = await requireOwner();
  if (!videoConfigured()) throw new Error("Video yüklemek için Mux bağlantısının kurulması gerekiyor.");
  const db = getDatabase();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!lesson || lesson.kind !== "video" || lesson.status !== "draft") throw new Error("Video değiştirmek için önce dersi taslak olarak kaydedin.");
  const upload = await muxRequest<{ id: string; url: string }>("uploads", { cors_origin: config().auth.url, new_asset_settings: newAssetSettings(lesson) });
  await db.transaction(async tx => {
    const [current] = await tx.select().from(lessons).where(eq(lessons.id, lesson.id)).for("update");
    if (current.status !== "draft") throw new Error("Ders taslak olmalıdır.");
    const [asset] = await tx.insert(videoAssets).values({ muxUploadId: upload.id }).returning();
    await tx.update(lessons).set({ videoAssetId: asset.id }).where(eq(lessons.id, lesson.id));
    await tx.insert(adminAuditLog).values({ actorId: viewer.user.id, action: "video.upload", resourceType: "lesson", resourceId: lesson.id, reason: "Video yüklemesi başlatıldı" });
  });
  return { url: upload.url };
}
export async function checkUpload(lessonId: string) {
  const viewer = await requireOwner();
  const db = getDatabase();
  const [row] = await db.select({ lesson: lessons, asset: videoAssets }).from(lessons).innerJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id)).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!row?.asset.muxUploadId) throw new Error("Yükleme bulunamadı.");
  if (row.asset.status === "ready") return { status: "ready" as const };
  const upload = await muxRequest<{ status: string; asset_id?: string }>(`uploads/${encodeURIComponent(row.asset.muxUploadId)}`);
  if (["errored", "timed_out", "cancelled"].includes(upload.status)) return { status: "failed" as const };
  if (!upload.asset_id) return { status: "processing" as const };
  const asset = describeAsset(await muxRequest<MuxAsset>(`assets/${encodeURIComponent(upload.asset_id)}`));
  if (asset.failed) return { status: "failed" as const };
  if (!asset.ready || !asset.signedPlaybackId) return { status: "processing" as const };
  await db.transaction(async tx => {
    const updated = await tx.update(videoAssets).set({ muxAssetId: asset.id, signedPlaybackId: asset.signedPlaybackId, status: "ready", durationSeconds: asset.durationSeconds, aspectRatio: asset.aspectRatio }).where(and(eq(videoAssets.id, row.asset.id), eq(videoAssets.status, row.asset.status))).returning();
    if (updated.length) await tx.insert(adminAuditLog).values({ actorId: viewer.user.id, action: "video.ready", resourceType: "lesson", resourceId: row.lesson.id, reason: "Video oynatılmaya hazır" });
  });
  changed(row.lesson.courseId);
  return { status: "ready" as const };
}

const assetId = z.string().regex(/^[A-Za-z0-9]{1,128}$/, "Geçersiz video.");

export async function listMuxLibrary(): Promise<{ assets: (AssetInfo & { thumbnail?: string; usedBy: string[] })[] } | { error: string }> {
  try {
    await requireOwner();
    if (!videoConfigured()) return { error: "Mux bağlantısı kurulmadan video kütüphanesi görüntülenemez." };
    const assets = await muxLibrary();
    const used = assets.length ? await getDatabase().select({ muxAssetId: videoAssets.muxAssetId, lesson: lessons.title })
      .from(videoAssets).innerJoin(lessons, eq(lessons.videoAssetId, videoAssets.id))
      .where(inArray(videoAssets.muxAssetId, assets.map(asset => asset.id))) : [];
    return { assets: assets.map(asset => ({
      ...asset,
      thumbnail: asset.signedPlaybackId ? thumbnailUrl(asset.signedPlaybackId) : asset.publicPlaybackIds[0] && thumbnailUrl(asset.publicPlaybackIds[0], false),
      usedBy: used.filter(row => row.muxAssetId === asset.id).map(row => row.lesson),
    })) };
  } catch (error) { return { error: errorMessage(error) }; }
}

// Paid lessons stay signed-only: add a signed playback ID, drop public ones, request Turkish captions if missing.
export async function attachMuxAsset(lessonId: string, rawAssetId: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    if (!videoConfigured()) throw new Error("Mux bağlantısı kurulmadan video eklenemez.");
    const id = assetId.parse(rawAssetId);
    const [[lesson], asset] = await Promise.all([
      getDatabase().select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId))),
      muxRequest<MuxAsset>(`assets/${id}`).then(describeAsset),
    ]);
    if (!lesson || lesson.kind !== "video") throw new Error("Ders bulunamadı.");
    if (!asset.ready) throw new Error("Bu video Mux’ta henüz hazırlanıyor. Hazır olduğunda yeniden deneyin.");
    const signedPlaybackId = asset.signedPlaybackId ?? (await muxRequest<{ id: string }>(`assets/${id}/playback-ids`, { policy: "signed" })).id;
    for (const playbackId of asset.publicPlaybackIds) await muxRequest(`assets/${id}/playback-ids/${playbackId}`, undefined, "DELETE");
    // Best effort; must not block attaching.
    if (asset.captions === "none" && asset.audioTrackId) await muxRequest(`assets/${id}/tracks/${asset.audioTrackId}/generate-subtitles`, { generated_subtitles: [captionLanguage] }).catch(() => undefined);
    if (!asset.title) await muxRequest(`assets/${id}`, { passthrough: lesson.id, meta: { title: lesson.title, external_id: lesson.id } }, "PATCH").catch(() => undefined);
    await attachVideo(getDatabase(), viewer.user.id, lesson.id, { muxAssetId: id, signedPlaybackId, durationSeconds: asset.durationSeconds, aspectRatio: asset.aspectRatio });
    changed(lesson.courseId);
    return { status: "success", message: asset.captions === "none" ? "Video derse bağlandı. Türkçe altyazı birkaç dakika içinde hazırlanır." : "Video derse bağlandı." };
  } catch (error) { return report(error); }
}

export async function previewPlayback(lessonId: string) {
  try {
    await requireOwner();
    const [row] = await getDatabase().select({ asset: videoAssets }).from(lessons).innerJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id)).where(eq(lessons.id, z.uuid().parse(lessonId)));
    if (row?.asset.status !== "ready" || !row.asset.signedPlaybackId) return { error: "Video henüz hazır değil." };
    return { playbackId: row.asset.signedPlaybackId, tokens: playbackTokens(row.asset.signedPlaybackId, ownerTokenExpiry()) };
  } catch (error) { return { error: errorMessage(error) }; }
}
