"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { adminAuditLog, lessons, videoAssets } from "@/lib/db/schema";
import { createLessons, updateLesson } from "@/lib/akademi/lesson-editor";
import { muxRequest, videoConfigured } from "@/lib/video/mux";
import { config } from "@/lib/config";
import type { FormState } from "@/components/akademi/form-status";

const report = (error: unknown): FormState => ({ status: "error", message: error instanceof z.ZodError ? "Lütfen ders alanlarını kontrol edin: " + error.issues[0]?.message : error instanceof Error && !["UNAUTHORIZED", "FORBIDDEN"].includes(error.message) && !error.message.includes("query") ? error.message : "İşlem tamamlanamadı. Yönetim oturumunuzu kontrol edin." });
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
export async function saveLesson(_: FormState, form: FormData): Promise<FormState> {
  try {
    const viewer = await requireOwner();
    const input = await updateLesson(getDatabase(), viewer.user.id, Object.fromEntries(form));
    changed(input.courseId);
    return { status: "success", message: input.status === "published" ? "Ders öğrencilerinize açıldı." : "Taslak kaydedildi." };
  } catch (error) { return report(error); }
}
export async function startUpload(lessonId: string) {
  const viewer = await requireOwner();
  if (!videoConfigured()) throw new Error("Video yüklemek için Mux bağlantısının kurulması gerekiyor.");
  const db = getDatabase();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, z.uuid().parse(lessonId)));
  if (!lesson || lesson.kind !== "video" || lesson.status !== "draft") throw new Error("Video değiştirmek için önce dersi taslak olarak kaydedin.");
  const upload = await muxRequest<{ id: string; url: string }>("uploads", { cors_origin: config().auth.url, new_asset_settings: { playback_policies: ["signed"], video_quality: "basic" } });
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
  const asset = await muxRequest<{ id: string; status: string; duration?: number; aspect_ratio?: string; playback_ids?: { id: string; policy: string }[] }>(`assets/${encodeURIComponent(upload.asset_id)}`);
  const playbackId = asset.playback_ids?.find(p => p.policy === "signed")?.id;
  if (asset.status === "errored") return { status: "failed" as const };
  if (asset.status !== "ready" || !playbackId) return { status: "processing" as const };
  await db.transaction(async tx => {
    const updated = await tx.update(videoAssets).set({ muxAssetId: asset.id, signedPlaybackId: playbackId, status: "ready", durationSeconds: Math.ceil(asset.duration ?? 0), aspectRatio: asset.aspect_ratio }).where(and(eq(videoAssets.id, row.asset.id), eq(videoAssets.status, row.asset.status))).returning();
    if (updated.length) await tx.insert(adminAuditLog).values({ actorId: viewer.user.id, action: "video.ready", resourceType: "lesson", resourceId: row.lesson.id, reason: "Video oynatılmaya hazır" });
  });
  changed(row.lesson.courseId);
  return { status: "ready" as const };
}
