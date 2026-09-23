import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuditLog, courses, lessons, liveSessions, modules, videoAssets } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

// The boundary authorizes an owner before calling these audited commands.
export const lessonInput = z.object({
  courseId: z.uuid(), lessonId: z.uuid(), title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10000), position: z.coerce.number().int().min(0).max(1000),
  status: z.enum(["draft", "published"]),
  startsAt: z.string().default(""), durationMinutes: z.coerce.number().int().min(1).max(1440).default(60),
  joinUrl: z.string().trim().max(2048).default(""), passcode: z.string().trim().max(100).default(""),
  liveStatus: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).default("scheduled"),
});

export async function ownerLessons(db: Database, courseId: string) {
  return db.select({ lesson: lessons, live: liveSessions, asset: videoAssets }).from(lessons)
    .leftJoin(liveSessions, eq(liveSessions.lessonId, lessons.id)).leftJoin(videoAssets, eq(videoAssets.id, lessons.videoAssetId))
    .where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position), asc(lessons.createdAt));
}

export async function createLessons(db: Database, actorId: string, courseId: string, kind: "video" | "live" | "template") {
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
      await tx.insert(lessons).values({ id, courseId, moduleId: section.id, slug: id, title: lessonKind === "live" ? "Canlı buluşma" : `${offset + index + 1}. video dersi`, kind: lessonKind, position: offset + index });
    }
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.create", resourceType: "course", resourceId: courseId, reason: `${kinds.length} taslak ders eklendi` });
  });
}

export async function updateLesson(db: Database, actorId: string, raw: unknown) {
  const input = lessonInput.parse(raw);
  await db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, input.lessonId), eq(lessons.courseId, input.courseId))).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    if (lesson.kind === "video" && input.status === "published") {
      const [asset] = lesson.videoAssetId ? await tx.select().from(videoAssets).where(eq(videoAssets.id, lesson.videoAssetId)) : [];
      if (asset?.status !== "ready" || !asset.signedPlaybackId) throw new Error("Yayınlamadan önce videoyu yükleyin ve hazırlanmasını bekleyin.");
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
    await tx.update(lessons).set({ title: input.title, description: input.description, position: input.position, status: input.status }).where(eq(lessons.id, lesson.id));
    if (input.status === "published") await tx.update(modules).set({ status: "published" }).where(eq(modules.id, lesson.moduleId));
    await tx.insert(adminAuditLog).values({ actorId, action: "lesson.update", resourceType: "lesson", resourceId: lesson.id, reason: input.status === "published" ? "Ders yayınlandı / güncellendi" : "Taslak kaydedildi" });
  });
  return input;
}
