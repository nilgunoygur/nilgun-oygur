import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { courses, lessonFiles, lessons, modules, lessonProgress, liveSessions, videoAssets } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { activeGrant } from "./course-access.ts";
import { canJoinLiveSession, hasWatched } from "./access-policy.ts";

// At most one recording per lesson (unique index), so this join never multiplies rows.
const recordingOf = and(eq(lessonFiles.lessonId, lessons.id), eq(lessonFiles.kind, "audio"));

/** Private learning reads never depend on whether the product is still for sale. Files are exposed by id only. */
export async function studentCourse(db: Database, userId: string, courseId: string, now = new Date()) {
  const grant = await activeGrant(db, userId, courseId, now);
  if (!grant) return null;
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return null;
  const rows = await db.select({
    id: lessons.id, title: lessons.title, description: lessons.description, kind: lessons.kind,
    moduleTitle: modules.title, durationSeconds: sql<number | null>`coalesce(${videoAssets.durationSeconds}, ${lessonFiles.durationSeconds})`,
    videoReady: sql<boolean>`${videoAssets.status} = 'ready'`, audioId: lessonFiles.id, peaks: lessonFiles.peaks, completedAt: lessonProgress.completedAt,
    lastPositionSeconds: lessonProgress.lastPositionSeconds,
    startsAt: liveSessions.startsAt, durationMinutes: liveSessions.durationMinutes, liveStatus: liveSessions.status,
  }).from(lessons).innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .leftJoin(lessonFiles, recordingOf)
    .leftJoin(liveSessions, eq(lessons.id, liveSessions.lessonId))
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)))
    .where(and(eq(lessons.courseId, courseId), eq(lessons.status, "published"), eq(modules.status, "published")))
    .orderBy(asc(modules.position), asc(lessons.position), asc(lessons.createdAt));
  const documents = rows.length ? await db.select({ id: lessonFiles.id, lessonId: lessonFiles.lessonId, name: lessonFiles.name, sizeBytes: lessonFiles.sizeBytes }).from(lessonFiles)
    .where(and(inArray(lessonFiles.lessonId, rows.map(row => row.id)), eq(lessonFiles.kind, "document"))).orderBy(asc(lessonFiles.createdAt)) : [];
  return { course, grant, lessons: rows.map(row => ({ ...row, documents: documents.filter(file => file.lessonId === row.id).map(({ id, name, sizeBytes }) => ({ id, name, sizeBytes })) })) };
}

/** Rechecked by every progress, playback, and live-join request. */
export async function accessibleLesson(db: Database, userId: string, lessonId: string, now = new Date()) {
  const [row] = await db.select({ lesson: lessons, asset: videoAssets, audio: lessonFiles, live: liveSessions }).from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .leftJoin(lessonFiles, recordingOf)
    .leftJoin(liveSessions, eq(lessons.id, liveSessions.lessonId))
    .where(and(eq(lessons.id, lessonId), eq(lessons.status, "published"), eq(modules.status, "published")));
  if (!row) return null;
  const grant = await activeGrant(db, userId, row.lesson.courseId, now);
  return grant ? { ...row, grant } : null;
}

export async function saveProgress(db: Database, userId: string, lessonId: string, input: { completed?: boolean; position?: number }, now = new Date()) {
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0 || input.position > 604800)) throw new Error("INVALID_POSITION");
  const accessible = await accessibleLesson(db, userId, lessonId, now);
  if (!accessible) throw new Error("FORBIDDEN");
  const duration = accessible.asset?.durationSeconds ?? accessible.audio?.durationSeconds;
  if (input.completed && duration) {
    const [previous] = await db.select({ position: lessonProgress.lastPositionSeconds }).from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    if (!hasWatched(Math.max(previous?.position ?? 0, input.position ?? 0), duration)) throw new Error("NOT_WATCHED");
  }
  const completedAt = input.completed === undefined ? undefined : input.completed ? now : null;
  const position = input.position === undefined ? undefined : Math.min(input.position, duration ?? input.position);
  await db.insert(lessonProgress).values({ userId, lessonId, completedAt, lastPositionSeconds: position, lastActivityAt: now })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { completedAt, lastPositionSeconds: position, lastActivityAt: now } });
}

/** A recording or homework PDF of a published lesson, for a student with active access to its course. */
export async function accessibleFile(db: Database, userId: string, fileId: string, now = new Date()) {
  const [file] = await db.select().from(lessonFiles).where(eq(lessonFiles.id, fileId));
  const lesson = file && await accessibleLesson(db, userId, file.lessonId, now);
  return lesson ? { file, grant: lesson.grant } : null;
}

export async function liveDestination(db: Database, userId: string, lessonId: string, now = new Date()) {
  const row = await accessibleLesson(db, userId, lessonId, now);
  if (!row?.live || !canJoinLiveSession(row.live, row.grant, userId, row.lesson.courseId, now)) return null;
  return { url: row.live.zoomJoinUrl, passcode: row.live.zoomPasscode };
}
