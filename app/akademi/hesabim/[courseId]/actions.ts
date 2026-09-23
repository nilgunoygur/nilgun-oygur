"use server";
import { z } from "zod";
import { requireStudent } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { accessibleLesson, liveDestination, saveProgress } from "@/lib/akademi/learning";
import { playbackExpiresAt } from "@/lib/akademi/access-policy";
import { playbackTokens } from "@/lib/video/mux";

const progressInput = z.object({ lessonId: z.uuid(), completed: z.boolean().optional(), position: z.number().int().min(0).max(604800).optional() });
export async function updateProgress(input: z.infer<typeof progressInput>) {
  try {
    const viewer = await requireStudent();
    const value = progressInput.parse(input);
    await saveProgress(getDatabase(), viewer.user.id, value.lessonId, value);
    return { ok: true };
  } catch { return { ok: false, error: "İlerlemeniz kaydedilemedi. Erişiminizi ve bağlantınızı kontrol edip yeniden deneyin." }; }
}

export async function getPlayback(lessonId: string) {
  try {
    const viewer = await requireStudent();
    const row = await accessibleLesson(getDatabase(), viewer.user.id, z.uuid().parse(lessonId));
    if (!row || row.asset?.status !== "ready" || !row.asset.signedPlaybackId) return { error: "Bu videoya şu anda erişilemiyor." };
    const expiresAt = playbackExpiresAt(row.grant, viewer.user.id, row.lesson.courseId, new Date());
    if (!expiresAt) return { error: "Eğitim erişiminiz sona erdi." };
    return { playbackId: row.asset.signedPlaybackId, tokens: playbackTokens(row.asset.signedPlaybackId, expiresAt), expiresAt };
  } catch { return { error: "Video başlatılamadı. Lütfen daha sonra yeniden deneyin." }; }
}

export async function joinLive(lessonId: string) {
  try {
    const viewer = await requireStudent();
    const destination = await liveDestination(getDatabase(), viewer.user.id, z.uuid().parse(lessonId));
    return destination ? { destination } : { error: "Katılım, dersin başlamasından 30 dakika önce açılır. Erişiminizin aktif olması gerekir." };
  } catch { return { error: "Canlı derse katılım doğrulanamadı." }; }
}
