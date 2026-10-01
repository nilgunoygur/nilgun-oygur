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
import { waveformBars } from "@/lib/audio-peaks";
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
// A video or audio lesson; the other kinds have nothing in Mux.
async function mediaLesson(lessonId: string) {
  const [lesson] = await getDatabase().select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!lesson || lesson.kind === "live") throw new Error("Ders bulunamadı.");
  return lesson;
}
/** null when the asset suits the lesson: a recording has no picture, a video has one. */
const wrongKind = (lesson: { kind: string }, asset: AssetInfo) => asset.audioOnly === (lesson.kind === "audio") ? null
  : lesson.kind === "audio" ? "Bu dosya bir video. Ses dersine yalnızca ses dosyası eklenebilir." : "Bu dosyada görüntü yok. Video dersine bir video dosyası ekleyin.";

// An upload never touches the lesson until Mux has a playable asset, so a published lesson keeps its current video or recording meanwhile.
export async function startUpload(lessonId: string) {
  const viewer = await requireOwner();
  if (!videoConfigured()) throw new Error("Dosya yüklemek için Mux bağlantısının kurulması gerekiyor.");
  const lesson = await mediaLesson(lessonId);
  const upload = await muxRequest<{ id: string; url: string }>("uploads", { cors_origin: config().auth.url, new_asset_settings: newAssetSettings(lesson) });
  await getDatabase().insert(adminAuditLog).values({ actorId: viewer.user.id, action: `${lesson.kind}.upload`, resourceType: "lesson", resourceId: lesson.id, reason: lesson.kind === "audio" ? "Ses kaydı yüklemesi başlatıldı" : "Video yüklemesi başlatıldı" });
  return { url: upload.url, uploadId: upload.id };
}

type MuxUpload = { status: string; asset_id?: string; error?: { message?: string }; new_asset_settings?: { passthrough?: string } };
const uploadFailure = (upload: MuxUpload) => /limited to \d+ assets/i.test(upload.error?.message ?? "")
  ? "Mux ücretsiz planındaki 10 dosya sınırı doldu. Yeni dosya yüklemek için Mux hesabınıza ödeme yöntemi ekleyin veya Mux panelinden kullanılmayan bir dosyayı silin."
  : upload.status === "timed_out" ? "Yükleme zaman aşımına uğradı. Dosyayı yeniden seçin." : "Dosya işlenemedi. Yeniden yükleyin.";
const waveform = z.array(z.number().int().min(0).max(100)).min(8).max(waveformBars).optional();

/** Attaches the uploaded file once Mux has prepared it; `peaks` is the waveform the owner's browser measured for a recording. */
export async function checkUpload(lessonId: string, uploadId: string, peaks?: number[]): Promise<{ status: "processing" | "ready" } | { status: "failed"; message: string }> {
  const viewer = await requireOwner();
  const lesson = await mediaLesson(lessonId);
  const upload = await muxRequest<MuxUpload>(`uploads/${encodeURIComponent(assetId.parse(uploadId))}`);
  if (upload.new_asset_settings?.passthrough && upload.new_asset_settings.passthrough !== lesson.id) throw new Error("Yükleme bulunamadı.");
  if (["errored", "timed_out", "cancelled"].includes(upload.status)) return { status: "failed", message: uploadFailure(upload) };
  if (!upload.asset_id) return { status: "processing" };
  const asset = describeAsset(await muxRequest<MuxAsset>(`assets/${encodeURIComponent(upload.asset_id)}`));
  if (asset.failed) return { status: "failed", message: uploadFailure(upload) };
  if (!asset.ready || !asset.signedPlaybackId) return { status: "processing" };
  const problem = wrongKind(lesson, asset);
  if (problem) return { status: "failed", message: `${problem} Yüklenen dosya Mux kütüphanenizde duruyor.` };
  await attachVideo(getDatabase(), viewer.user.id, lesson.id, { muxAssetId: asset.id, signedPlaybackId: asset.signedPlaybackId, durationSeconds: asset.durationSeconds, aspectRatio: asset.aspectRatio, peaks: lesson.kind === "audio" ? waveform.safeParse(peaks).data : undefined },
    lesson.kind === "audio" ? "Yüklenen ses kaydı derse bağlandı" : "Yüklenen video derse bağlandı");
  changed(lesson.courseId);
  return { status: "ready" };
}

const assetId = z.string().regex(/^[A-Za-z0-9]{1,128}$/, "Geçersiz dosya.");

export async function listMuxLibrary(): Promise<{ assets: (AssetInfo & { thumbnail?: string; usedBy: string[] })[] } | { error: string }> {
  try {
    await requireOwner();
    if (!videoConfigured()) return { error: "Mux bağlantısı kurulmadan kütüphane görüntülenemez." };
    const assets = await muxLibrary();
    const used = assets.length ? await getDatabase().select({ muxAssetId: videoAssets.muxAssetId, lesson: lessons.title })
      .from(videoAssets).innerJoin(lessons, eq(lessons.videoAssetId, videoAssets.id))
      .where(inArray(videoAssets.muxAssetId, assets.map(asset => asset.id))) : [];
    return { assets: assets.map(asset => ({
      ...asset,
      // A recording has no picture to take a thumbnail from.
      thumbnail: asset.audioOnly ? undefined : asset.signedPlaybackId ? thumbnailUrl(asset.signedPlaybackId) : asset.publicPlaybackIds[0] && thumbnailUrl(asset.publicPlaybackIds[0], false),
      usedBy: used.filter(row => row.muxAssetId === asset.id).map(row => row.lesson),
    })) };
  } catch (error) { return { error: errorMessage(error) }; }
}

// Paid lessons stay signed-only: add a signed playback ID, drop public ones, request Turkish captions for a video without them.
export async function attachMuxAsset(lessonId: string, rawAssetId: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    if (!videoConfigured()) throw new Error("Mux bağlantısı kurulmadan dosya eklenemez.");
    const id = assetId.parse(rawAssetId);
    const [lesson, asset] = await Promise.all([mediaLesson(lessonId), muxRequest<MuxAsset>(`assets/${id}`).then(describeAsset)]);
    if (!asset.ready) throw new Error("Bu dosya Mux’ta henüz hazırlanıyor. Hazır olduğunda yeniden deneyin.");
    const problem = wrongKind(lesson, asset);
    if (problem) throw new Error(problem);
    const signedPlaybackId = asset.signedPlaybackId ?? (await muxRequest<{ id: string }>(`assets/${id}/playback-ids`, { policy: "signed" })).id;
    for (const playbackId of asset.publicPlaybackIds) await muxRequest(`assets/${id}/playback-ids/${playbackId}`, undefined, "DELETE");
    const audio = lesson.kind === "audio", captioning = !audio && asset.captions === "none" && !!asset.audioTrackId;
    // Best effort; must not block attaching.
    if (captioning) await muxRequest(`assets/${id}/tracks/${asset.audioTrackId}/generate-subtitles`, { generated_subtitles: [captionLanguage] }).catch(() => undefined);
    if (!asset.title) await muxRequest(`assets/${id}`, { passthrough: lesson.id, meta: { title: lesson.title, external_id: lesson.id } }, "PATCH").catch(() => undefined);
    await attachVideo(getDatabase(), viewer.user.id, lesson.id, { muxAssetId: id, signedPlaybackId, durationSeconds: asset.durationSeconds, aspectRatio: asset.aspectRatio }, audio ? "Mux kütüphanesinden ses kaydı bağlandı" : undefined);
    changed(lesson.courseId);
    return { status: "success", message: audio ? "Ses kaydı derse bağlandı." : captioning ? "Video derse bağlandı. Türkçe altyazı birkaç dakika içinde hazırlanır." : "Video derse bağlandı." };
  } catch (error) { return report(error); }
}

export async function previewPlayback(lessonId: string) {
  try {
    await requireOwner();
    const [row] = await getDatabase().select({ asset: videoAssets }).from(lessons).innerJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id)).where(eq(lessons.id, z.uuid().parse(lessonId)));
    if (row?.asset.status !== "ready" || !row.asset.signedPlaybackId) return { error: "Dosya henüz hazır değil." };
    return { playbackId: row.asset.signedPlaybackId, tokens: playbackTokens(row.asset.signedPlaybackId, ownerTokenExpiry()) };
  } catch (error) { return { error: errorMessage(error) }; }
}

const filesMissing = "PDF yüklemek için dosya depolama bağlantısının (Vercel Blob) kurulması gerekiyor.";

/** Step 1 of a homework PDF upload: a token that lets this browser upload exactly one file to a fresh private pathname. */
export async function prepareLessonFile(input: { lessonId: string; name: string; type: string; size: number }): Promise<{ pathname: string; token: string } | { error: string }> {
  try {
    await requireOwner();
    if (!filesConfigured()) return { error: filesMissing };
    const file = z.object({ lessonId: z.uuid(), name: z.string().min(1).max(300), type: z.string().max(100), size: z.number().int().positive() }).parse(input);
    const problem = lessonFileProblem(file);
    if (problem) return { error: problem };
    const [lesson] = await getDatabase().select({ id: lessons.id }).from(lessons).where(eq(lessons.id, file.lessonId));
    if (!lesson) return { error: "Ders bulunamadı." };
    const pathname = lessonFilePath(file.lessonId, randomUUID(), file.name);
    return { pathname, token: await uploadToken(pathname, lessonFileRules) };
  } catch (error) { return { error: errorMessage(error) }; }
}

/** Step 2: records the uploaded PDF after checking what actually reached the store. */
export async function saveLessonFile(input: { lessonId: string; pathname: string; name: string }): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    if (!filesConfigured()) throw new Error(filesMissing);
    const lessonId = z.uuid().parse(input.lessonId);
    if (!isLessonFilePath(lessonId, input.pathname)) throw new Error("Geçersiz dosya.");
    const stored = await storedFile(input.pathname);
    if (!stored) throw new Error("Yüklenen dosya bulunamadı. Lütfen yeniden yükleyin.");
    const saved = await addLessonFile(getDatabase(), viewer.user.id, { lessonId, pathname: input.pathname, name: input.name, mime: stored.contentType, sizeBytes: stored.size })
      .catch(async error => { await deleteStoredFiles([input.pathname]); throw error; });
    changed(saved.courseId);
    return { status: "success", message: "PDF derse eklendi." };
  } catch (error) { return report(error); }
}

export async function deleteLessonFile(fileId: string): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const removed = await removeLessonFile(getDatabase(), viewer.user.id, z.uuid().parse(fileId));
    if (filesConfigured()) await deleteStoredFiles([removed.pathname]);
    changed(removed.courseId);
    return { status: "success", message: "PDF silindi." };
  } catch (error) { return report(error); }
}
