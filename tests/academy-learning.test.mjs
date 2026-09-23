import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { studentCourse, accessibleLesson, saveProgress, liveDestination } from "../lib/akademi/learning.ts";
import { createLessons, updateLesson, ownerLessons } from "../lib/akademi/lesson-editor.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
const now = new Date("2026-09-23T09:00:00Z");
let course, video, live;
before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values([{ id: "buyer", name: "Buyer", email: "buyer@example.com", emailVerified: true }, { id: "other", name: "Other", email: "other@example.com", emailVerified: true }, { id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true }]);
  await db.insert(schema.owners).values({ userId: "owner" });
  [course] = await db.insert(schema.courses).values({ slug: "test-course", shopierProductId: "12345" }).returning();
  await db.insert(schema.courseAccess).values({ userId: "buyer", courseId: course.id, grantedBy: "owner", grantReason: "Test fixture", startsAt: new Date("2026-09-22"), expiresAt: new Date("2026-09-24") });
});
after(() => client.close());
const input = (lesson, patch = {}) => ({ courseId: course.id, lessonId: lesson.id, title: lesson.title, description: "Lesson notes", position: lesson.position, status: "published", startsAt: "", durationMinutes: 60, joinUrl: "", passcode: "", liveStatus: "scheduled", ...patch });

test("the four-video + live template is private until published and cannot be duplicated", async () => {
  await createLessons(db, "owner", course.id, "template");
  const rows = await ownerLessons(db, course.id);
  assert.deepEqual(rows.map(r => r.lesson.kind), ["video", "video", "video", "video", "live"]);
  video = rows[0].lesson; live = rows[4].lesson;
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons.length, 0);
  await assert.rejects(() => createLessons(db, "owner", course.id, "template"));
  assert.equal((await ownerLessons(db, course.id)).length, 5);
});

test("publishing requires a ready signed video or a dated HTTPS live session", async () => {
  await assert.rejects(() => updateLesson(db, "owner", input(video)), /videoyu/);
  await assert.rejects(() => updateLesson(db, "owner", input(live)), /geçerli/);
  await assert.rejects(() => updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", joinUrl: "javascript:alert(1)" })), /geçerli/);
  const [asset] = await db.insert(schema.videoAssets).values({ muxAssetId: "asset-1", signedPlaybackId: "signed-1", status: "ready", durationSeconds: 120 }).returning();
  await db.update(schema.lessons).set({ videoAssetId: asset.id }).where(eq(schema.lessons.id, video.id));
  await updateLesson(db, "owner", input(video));
  await updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", joinUrl: "https://zoom.us/j/123", passcode: "secret" }));
  const result = await studentCourse(db, "buyer", course.id, now);
  assert.equal(result.lessons.length, 2);
  assert.equal(result.lessons[1].startsAt.toISOString(), now.toISOString(), "editor dates use Istanbul time");
  const serialized = JSON.stringify(result);
  for (const secret of ["secret", "zoom.us", "signed-1", "asset-1"]) assert.ok(!serialized.includes(secret), "course page does not expose media credentials");
});

test("unpaid and expired users cannot read lessons or write progress", async () => {
  assert.equal(await studentCourse(db, "other", course.id, now), null);
  assert.equal(await accessibleLesson(db, "other", video.id, now), null);
  await assert.rejects(() => saveProgress(db, "other", video.id, { completed: true }, now), /FORBIDDEN/);
  assert.equal(await studentCourse(db, "buyer", course.id, new Date("2026-09-24")), null);
  await assert.rejects(() => saveProgress(db, "buyer", video.id, { completed: true }, new Date("2026-09-24")), /FORBIDDEN/);
});

test("completion persists, position saves preserve it, and students can undo it", async () => {
  await saveProgress(db, "buyer", video.id, { completed: true }, now);
  await saveProgress(db, "buyer", video.id, { position: 999 }, now);
  let result = await studentCourse(db, "buyer", course.id, now);
  assert.equal(result.lessons[0].completedAt.toISOString(), now.toISOString());
  assert.equal(result.lessons[0].lastPositionSeconds, 120);
  await saveProgress(db, "buyer", video.id, { completed: false }, now);
  result = await studentCourse(db, "buyer", course.id, now);
  assert.equal(result.lessons[0].completedAt, null);
  assert.equal(result.lessons[0].lastPositionSeconds, 120);
  await assert.rejects(() => saveProgress(db, "buyer", video.id, { position: -1 }, now), /INVALID_POSITION/);
});

test("live joining requires active access and the scheduled time window", async () => {
  assert.equal(await liveDestination(db, "other", live.id, now), null);
  assert.equal(await liveDestination(db, "buyer", live.id, new Date("2026-09-23T08:29:59Z")), null);
  assert.deepEqual(await liveDestination(db, "buyer", live.id, now), { url: "https://zoom.us/j/123", passcode: "secret" });
  assert.equal(await liveDestination(db, "buyer", live.id, new Date("2026-09-23T10:30:00Z")), null);
  await updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", joinUrl: "https://zoom.us/j/123", liveStatus: "cancelled" }));
  assert.equal(await liveDestination(db, "buyer", live.id, now), null);
});

test("unpublishing a lesson or its module blocks existing direct links and mutations", async () => {
  await updateLesson(db, "owner", input(video, { status: "draft" }));
  assert.equal(await accessibleLesson(db, "buyer", video.id, now), null);
  await assert.rejects(() => saveProgress(db, "buyer", video.id, { completed: true }, now), /FORBIDDEN/);
  await db.update(schema.modules).set({ status: "draft" }).where(eq(schema.modules.id, live.moduleId));
  assert.equal(await accessibleLesson(db, "buyer", live.id, now), null);
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons.length, 0);
  assert.ok((await db.select().from(schema.adminAuditLog)).length >= 5);
});
