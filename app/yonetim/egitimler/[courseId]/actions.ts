"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, lessons, videoAssets } from "@/lib/db/schema";
import { attachVideo, createLessons, deleteLesson, reorderLessons, updateLesson } from "@/lib/akademi/lesson-editor";
import type { lessonInput } from "@/lib/akademi/owner-forms";
import { addLessonFile, removeLessonFile } from "@/lib/akademi/lesson-files";
import { isLessonFilePath, lessonFilePath, lessonFileProblem, lessonFileRules } from "@/lib/akademi/lesson-file-rules";
import { deleteStoredFiles, filesConfigured, storedFile, uploadToken } from "@/lib/files/storage";
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
    await createLessons(getDatabase(), viewer.user.id, courseId, z.enum(["video", "live", "audio", "template"]).parse(form.get("kind")));
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
export async function removeLesson(courseId: string, lessonId: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const id = z.uuid().parse(courseId);
    const files = await deleteLesson(getDatabase(), viewer.user.id, id, z.uuid().parse(lessonId));
    if (filesConfigured()) await deleteStoredFiles(files);
    changed(id);
    return { status: "success", message: "Ders silindi." };
  } catch (error) { return report(error); }
}
// An upload never touches the lesson until Mux has a playable asset, so a published lesson keeps its current video meanwhile.
export async function startUpload(lessonId: string) {
  const viewer = await requireOwner();
  if (!videoConfigured()) throw new Error("Video yüklemek için Mux bağlantısının kurulması gerekiyor.");
  const db = getDatabase();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!lesson || lesson.kind !== "video") throw new Error("Ders bulunamadı.");
  const upload = await muxRequest<{ id: string; url: string }>("uploads", { cors_origin: config().auth.url, new_asset_settings: newAssetSettings(lesson) });
  await db.insert(adminAuditLog).values({ actorId: viewer.user.id, action: "video.upload", resourceType: "lesson", resourceId: lesson.id, reason: "Video yüklemesi başlatıldı" });
  return { url: upload.url, uploadId: upload.id };
}

type MuxUpload = { status: string; asset_id?: string; error?: { message?: string }; new_asset_settings?: { passthrough?: string } };
const uploadFailure = (upload: MuxUpload) => /limited to \d+ assets/i.test(upload.error?.message ?? "")
  ? "Mux ücretsiz planındaki 10 video sınırı doldu. Yeni video yüklemek için Mux hesabınıza ödeme yöntemi ekleyin veya Mux panelinden kullanılmayan bir videoyu silin."
  : upload.status === "timed_out" ? "Yükleme zaman aşımına uğradı. Dosyayı yeniden seçin." : "Video işlenemedi. Dosyayı yeniden yükleyin.";

/** Attaches the uploaded video once Mux has prepared it. */
export async function checkUpload(lessonId: string, uploadId: string): Promise<{ status: "processing" | "ready" } | { status: "failed"; message: string }> {
  const viewer = await requireOwner();
  const db = getDatabase();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!lesson || lesson.kind !== "video") throw new Error("Ders bulunamadı.");
  const upload = await muxRequest<MuxUpload>(`uploads/${encodeURIComponent(assetId.parse(uploadId))}`);
  if (upload.new_asset_settings?.passthrough && upload.new_asset_settings.passthrough !== lesson.id) throw new Error("Yükleme bulunamadı.");
  if (["errored", "timed_out", "cancelled"].includes(upload.status)) return { status: "failed", message: uploadFailure(upload) };
  if (!upload.asset_id) return { status: "processing" };
  const asset = describeAsset(await muxRequest<MuxAsset>(`assets/${encodeURIComponent(upload.asset_id)}`));
  if (asset.failed) return { status: "failed", message: uploadFailure(upload) };
  if (!asset.ready || !asset.signedPlaybackId) return { status: "processing" };
  await attachVideo(db, viewer.user.id, lesson.id, { muxAssetId: asset.id, signedPlaybackId: asset.signedPlaybackId, durationSeconds: asset.durationSeconds, aspectRatio: asset.aspectRatio }, "Yüklenen video derse bağlandı");
  changed(lesson.courseId);
  return { status: "ready" };
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

const fileKind = z.enum(["audio", "document"]);
const filesMissing = "Dosya yüklemek için depolama bağlantısının (Vercel Blob) kurulması gerekiyor.";

/** Step 1 of a file upload: a token that lets this browser upload exactly one file to a fresh private pathname. */
export async function prepareLessonFile(input: { lessonId: string; kind: "audio" | "document"; name: string; type: string; size: number }): Promise<{ pathname: string; token: string } | { error: string }> {
  try {
    await requireOwner();
    if (!filesConfigured()) return { error: filesMissing };
    const file = z.object({ lessonId: z.uuid(), kind: fileKind, name: z.string().min(1).max(300), type: z.string().max(100), size: z.number().int().positive() }).parse(input);
    const problem = lessonFileProblem(file.kind, file);
    if (problem) return { error: problem };
    const [lesson] = await getDatabase().select({ kind: lessons.kind }).from(lessons).where(eq(lessons.id, file.lessonId));
    if (!lesson || (file.kind === "audio" && lesson.kind !== "audio")) return { error: "Ders bulunamadı." };
    const pathname = lessonFilePath(file.lessonId, randomUUID(), file.name);
    return { pathname, token: await uploadToken(pathname, lessonFileRules[file.kind]) };
  } catch (error) { return { error: errorMessage(error) }; }
}

/** Step 2: records the uploaded file after checking what actually reached the store. */
export async function saveLessonFile(input: { lessonId: string; kind: "audio" | "document"; pathname: string; name: string; durationSeconds?: number; peaks?: number[] | null }): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    if (!filesConfigured()) throw new Error(filesMissing);
    const lessonId = z.uuid().parse(input.lessonId), kind = fileKind.parse(input.kind);
    if (!isLessonFilePath(lessonId, input.pathname)) throw new Error("Geçersiz dosya.");
    const stored = await storedFile(input.pathname);
    if (!stored) throw new Error("Yüklenen dosya bulunamadı. Lütfen yeniden yükleyin.");
    const base = { lessonId, pathname: input.pathname, name: input.name, mime: stored.contentType, sizeBytes: stored.size };
    const saved = await addLessonFile(getDatabase(), viewer.user.id, kind === "audio" ? { ...base, kind, durationSeconds: input.durationSeconds ?? 0, peaks: input.peaks ?? null } : { ...base, kind })
      .catch(async error => { await deleteStoredFiles([input.pathname]); throw error; });
    await deleteStoredFiles(saved.replaced);
    changed(saved.courseId);
    return { status: "success", message: kind === "audio" ? "Ses kaydı derse eklendi." : "PDF derse eklendi." };
  } catch (error) { return report(error); }
}

export async function deleteLessonFile(fileId: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const removed = await removeLessonFile(getDatabase(), viewer.user.id, z.uuid().parse(fileId));
    if (filesConfigured()) await deleteStoredFiles([removed.pathname]);
    changed(removed.courseId);
    return { status: "success", message: "Dosya silindi." };
  } catch (error) { return report(error); }
}
