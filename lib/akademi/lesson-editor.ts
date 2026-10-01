import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminAuditLog, courses, lessonFiles, lessonProgress, lessons, liveSessions, modules, videoAssets } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { lessonDocuments } from "./lesson-files.ts";
import { lessonInput } from "./owner-forms.ts";

// The boundary authorizes an owner before calling these audited commands.

export async function ownerLessons(db: Database, courseId: string) {
  const rows = await db.select({ lesson: lessons, live: liveSessions, asset: videoAssets }).from(lessons)
    .leftJoin(liveSessions, eq(liveSessions.lessonId, lessons.id)).leftJoin(videoAssets, eq(videoAssets.id, lessons.videoAssetId))
    .where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position), asc(lessons.createdAt));
  const documents = await lessonDocuments(db, rows.map(row => row.lesson.id));
  return rows.map(row => ({ ...row, documents: documents(row.lesson.id) }));
}

export async function createLessons(db: Database, actorId: string, courseId: string, kind: "video" | "live" | "audio" | "template") {
  return db.transaction(async tx => {
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("update");
    if (!course) throw new Error("Eğitim bulunamadı.");
    const existing = await tx.select({ position: lessons.position }).from(lessons).where(eq(lessons.courseId, courseId));
    if (kind === "template" && existing.length) throw new Error("Şablon yalnızca boş eğitimlere eklenebilir.");
    let [section] = await tx.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.position)).limit(1);
    if (!section) [section] = await tx.insert(modules).values({ courseId, title: "Eğitim programı", status: "published" }).returning();
    const kinds = kind === "template" ? ["video", "video", "video", "video", "live"] as const : [kind];
    const offset = existing.length ? Math.max(...existing.map(r => r.position)) + 1 : 0;
    for (const [index, lessonKind] of kinds.entries()) {
      const id = randomUUID();
      await tx.insert(lessons).values({ id, courseId, moduleId: section.id, slug: id, title: lessonKind === "live" ? "Canlı buluşma" : `${offset + index + 1}. ${lessonKind === "audio" ? "ses" : "video"} dersi`, kind: lessonKind, position: offset + index });
    }
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.create", resourceType: "course", resourceId: courseId, reason: `${kinds.length} taslak ders eklendi` });
  });
}

export async function updateLesson(db: Database, actorId: string, raw: unknown) {
  const input = lessonInput.parse(raw);
  await db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, input.lessonId), eq(lessons.courseId, input.courseId))).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    if (lesson.kind !== "live" && input.status === "published") {
      const [asset] = lesson.videoAssetId ? await tx.select().from(videoAssets).where(eq(videoAssets.id, lesson.videoAssetId)) : [];
      if (asset?.status !== "ready" || !asset.signedPlaybackId) throw new Error(`Yayınlamadan önce ${lesson.kind === "audio" ? "ses kaydını" : "videoyu"} yükleyin ve hazırlanmasını bekleyin.`);
    }
    if (lesson.kind === "live") {
      const validUrl = z.url({ protocol: /^https$/ }).safeParse(input.joinUrl);
      const startsAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.startsAt) ? new Date(`${input.startsAt}:00+03:00`) : new Date(NaN);
      const ready = Number.isFinite(startsAt.getTime()) && validUrl.success;
      if (!ready && (input.status === "published" || input.startsAt || input.joinUrl)) throw new Error("Canlı ders için geçerli bir tarih ve HTTPS toplantı bağlantısı girin.");
      if (ready) {
        const [previous] = await tx.select().from(liveSessions).where(eq(liveSessions.lessonId, lesson.id));
        const changed = previous && (previous.startsAt.getTime() !== startsAt.getTime() || previous.durationMinutes !== input.durationMinutes || previous.status !== input.liveStatus);
        const values = { startsAt, durationMinutes: input.durationMinutes, zoomJoinUrl: input.joinUrl, zoomPasscode: input.passcode, status: input.liveStatus, calendarSequence: (previous?.calendarSequence ?? 0) + (changed ? 1 : 0) };
        await tx.insert(liveSessions).values({ lessonId: lesson.id, ...values }).onConflictDoUpdate({ target: liveSessions.lessonId, set: values });
      }
    }
    await tx.update(lessons).set({ title: input.title, description: input.description, status: input.status }).where(eq(lessons.id, lesson.id));
    if (input.status === "published") await tx.update(modules).set({ status: "published" }).where(eq(modules.id, lesson.moduleId));
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.update", resourceType: "lesson", resourceId: lesson.id, reason: input.status === "published" ? "Ders yayınlandı / güncellendi" : "Taslak kaydedildi" });
  });
  return input;
}

// The Mux asset is kept; returns the removed PDFs' pathnames for the caller to delete from storage.
export async function deleteLesson(db: Database, actorId: string, courseId: string, lessonId: string) {
  return db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId))).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    await tx.delete(liveSessions).where(eq(liveSessions.lessonId, lesson.id));
    await tx.delete(lessonProgress).where(eq(lessonProgress.lessonId, lesson.id));
    const files = await tx.delete(lessonFiles).where(eq(lessonFiles.lessonId, lesson.id)).returning({ pathname: lessonFiles.pathname });
    await tx.delete(lessons).where(eq(lessons.id, lesson.id));
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.delete", resourceType: "course", resourceId: courseId, reason: `“${lesson.title}” dersi silindi (${lesson.status})` });
    return files.map(file => file.pathname);
  });
}

/** Attaches a ready Mux asset to a video or audio lesson; stored `peaks` are kept when none are given. */
export async function attachAsset(db: Database, actorId: string, lesson: { id: string; kind: string }, { muxAssetId, ...values }: { muxAssetId: string; signedPlaybackId: string; durationSeconds: number; aspectRatio?: string; peaks?: number[] }, reason: string) {
  await db.transaction(async tx => {
    const [asset] = await tx.insert(videoAssets).values({ muxAssetId, ...values, status: "ready" })
      .onConflictDoUpdate({ target: videoAssets.muxAssetId, set: { ...values, status: "ready" } }).returning();
    await tx.update(lessons).set({ videoAssetId: asset.id }).where(eq(lessons.id, lesson.id));
    await tx.insert(adminAuditLog).values({ actorId, action: `${lesson.kind}.attach`, resourceType: "lesson", resourceId: lesson.id, reason });
  });
}

export async function reorderLessons(db: Database, actorId: string, courseId: string, lessonIds: string[]) {
  await db.transaction(async tx => {
    const current = new Set((await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId)).for("update")).map(row => row.id));
    if (lessonIds.length !== current.size || !lessonIds.every(id => current.delete(id))) throw new Error("Ders listesi değişmiş. Sayfayı yenileyip yeniden deneyin.");
    const positions = sql.join(lessonIds.map((id, position) => sql`(${id}::uuid, ${position}::int)`), sql`, `);
    await tx.execute(sql`update ${lessons} set position = v.position from (values ${positions}) as v(id, position) where ${lessons.id} = v.id and ${lessons.position} <> v.position`);
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.reorder", resourceType: "course", resourceId: courseId, reason: "Ders sırası değiştirildi" });
  });
}
