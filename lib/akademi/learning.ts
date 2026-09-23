import { and, asc, eq, sql } from "drizzle-orm";
import { courses, lessons, modules, lessonProgress, liveSessions, videoAssets } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { activeGrant } from "./course-access.ts";
import { canJoinLiveSession } from "./access-policy.ts";

/** Private learning reads never depend on whether the product is still for sale. */
export async function studentCourse(db: Database, userId: string, courseId: string, now = new Date()) {
  const grant = await activeGrant(db, userId, courseId, now);
  if (!grant) return null;
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return null;
  const rows = await db.select({
    id: lessons.id, title: lessons.title, description: lessons.description, kind: lessons.kind,
    moduleTitle: modules.title, durationSeconds: videoAssets.durationSeconds,
    videoReady: sql<boolean>`${videoAssets.status} = 'ready'`, completedAt: lessonProgress.completedAt,
    lastPositionSeconds: lessonProgress.lastPositionSeconds,
    startsAt: liveSessions.startsAt, durationMinutes: liveSessions.durationMinutes, liveStatus: liveSessions.status,
  }).from(lessons).innerJoin(modules, eq(lessons.moduleId, modules.id))
    .leftJoin(videoAssets, eq(lessons.videoAssetId, videoAssets.id))
    .leftJoin(liveSessions, eq(lessons.id, liveSessions.lessonId))
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)))
    .where(and(eq(lessons.courseId, courseId), eq(lessons.status, "published"), eq(modules.status, "published")))
    .orderBy(asc(modules.position), asc(lessons.position), asc(lessons.createdAt));
  return { course, grant, lessons: rows };
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
  return grant ? { ...row, grant } : null;
}

export async function saveProgress(db: Database, userId: string, lessonId: string, input: { completed?: boolean; position?: number }, now = new Date()) {
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0 || input.position > 604800)) throw new Error("INVALID_POSITION");
  const accessible = await accessibleLesson(db, userId, lessonId, now);
  if (!accessible) throw new Error("FORBIDDEN");
  const completedAt = input.completed === undefined ? undefined : input.completed ? now : null;
  const position = input.position === undefined ? undefined : Math.min(input.position, accessible.asset?.durationSeconds ?? input.position);
  await db.insert(lessonProgress).values({ userId, lessonId, completedAt, lastPositionSeconds: position, lastActivityAt: now })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { completedAt, lastPositionSeconds: position, lastActivityAt: now } });
}

export async function liveDestination(db: Database, userId: string, lessonId: string, now = new Date()) {
  const row = await accessibleLesson(db, userId, lessonId, now);
  if (!row?.live || !canJoinLiveSession(row.live, row.grant, userId, row.lesson.courseId, now)) return null;
  return { url: row.live.zoomJoinUrl, passcode: row.live.zoomPasscode };
}
