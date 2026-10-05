import { and, asc, eq, sql } from "drizzle-orm";
import { courses, lessonFiles, lessons, modules, lessonProgress, liveSessions, videoAssets } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { activeGrant } from "./course-access.ts";
import { lessonDocuments } from "./lesson-files.ts";
import { canJoinLiveSession, hasWatched } from "./access-policy.ts";
import { lessonPrerequisites } from "./lesson-sequence.ts";

const lessonOrder = () => [asc(modules.position), asc(modules.createdAt), asc(modules.id), asc(lessons.position), asc(lessons.createdAt), asc(lessons.id)];

/** Private learning reads never depend on whether the product is still for sale. Homework PDFs are exposed by id only. */
export async function studentCourse(db: Database, userId: string, courseId: string, now = new Date()) {
  const grant = await activeGrant(db, userId, courseId, now);
  if (!grant) return null;
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return null;
  const rows = await db.select({
    id: lessons.id, title: lessons.title, description: lessons.description, kind: lessons.kind,
    moduleTitle: modules.title, durationSeconds: videoAssets.durationSeconds,
    mediaReady: sql<boolean>`${videoAssets.status} = 'ready'`, peaks: videoAssets.peaks, completedAt: lessonProgress.completedAt,
    lastPositionSeconds: lessonProgress.lastPositionSeconds,
    startsAt: liveSessions.startsAt, durationMinutes: liveSessions.durationMinutes, liveStatus: liveSessions.status,
  }).from(lessons).innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .leftJoin(liveSessions, eq(lessons.id, liveSessions.lessonId))
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)))
    .where(and(eq(lessons.courseId, courseId), eq(lessons.status, "published"), eq(modules.status, "published")))
    .orderBy(...lessonOrder());
  const documents = await lessonDocuments(db, rows.map(row => row.id));
  return { course, grant, lessons: rows.map(row => ({ ...row, documents: documents(row.id) })) };
}

/** Rechecked by every progress, playback, and live-join request. */
export async function accessibleLesson(db: Database, userId: string, lessonId: string, now = new Date()) {
  const [row] = await db.select({ lesson: lessons, asset: videoAssets, live: liveSessions }).from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .leftJoin(liveSessions, eq(lessons.id, liveSessions.lessonId))
    .where(and(eq(lessons.id, lessonId), eq(lessons.status, "published"), eq(modules.status, "published")));
  if (!row) return null;
  const grant = await activeGrant(db, userId, row.lesson.courseId, now);
  if (!grant) return null;
  if (row.lesson.kind !== "live") {
    const sequence = await db.select({ id: lessons.id, title: lessons.title, kind: lessons.kind, completedAt: lessonProgress.completedAt }).from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)))
      .where(and(eq(lessons.courseId, row.lesson.courseId), eq(lessons.status, "published"), eq(modules.status, "published"))).orderBy(...lessonOrder());
    const prerequisites = lessonPrerequisites(sequence, new Set(sequence.filter(step => step.completedAt).map(step => step.id)));
    if (prerequisites.get(lessonId)) return null;
  }
  return { ...row, grant };
}

export async function saveProgress(db: Database, userId: string, lessonId: string, input: { completed?: boolean; position?: number }, now = new Date()) {
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0 || input.position > 604800)) throw new Error("INVALID_POSITION");
  const accessible = await accessibleLesson(db, userId, lessonId, now);
  if (!accessible) throw new Error("FORBIDDEN");
  const duration = accessible.asset?.durationSeconds;
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

export async function accessibleFile(db: Database, userId: string, fileId: string, now = new Date()) {
  const [file] = await db.select().from(lessonFiles).where(eq(lessonFiles.id, fileId));
  return file && await accessibleLesson(db, userId, file.lessonId, now) ? file : null;
}

export async function liveDestination(db: Database, userId: string, lessonId: string, now = new Date()) {
  const row = await accessibleLesson(db, userId, lessonId, now);
  if (!row?.live || !canJoinLiveSession(row.live, row.grant, userId, row.lesson.courseId, now)) return null;
  return { meetingId: row.live.zoomMeetingId, passcode: row.live.zoomPasscode };
}
