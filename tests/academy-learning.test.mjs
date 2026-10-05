import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { zoomLinks, zoomMeetingId } from "../lib/akademi/zoom.ts";
import { plainToHtml } from "../lib/html.ts";
import { courseForRoute } from "../lib/akademi/course-route.ts";
import { studentCourse, accessibleLesson, accessibleFile, saveProgress, liveDestination } from "../lib/akademi/learning.ts";
import { attachAsset, createLessons, deleteLesson, reorderLessons, updateLesson, ownerLessons } from "../lib/akademi/lesson-editor.ts";
import { addLessonFile, removeLessonFile } from "../lib/akademi/lesson-files.ts";

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
const input = (lesson, patch = {}) => ({ courseId: course.id, lessonId: lesson.id, title: lesson.title, description: "Lesson notes", status: "published", startsAt: "", durationMinutes: 60, meetingId: "", passcode: "", liveStatus: "scheduled", ...patch });

test("the four-video + live template is private until published and cannot be duplicated", async () => {
  await createLessons(db, "owner", course.id, "template");
  const rows = await ownerLessons(db, course.id);
  assert.deepEqual(rows.map(r => r.lesson.kind), ["video", "video", "video", "video", "live"]);
  video = rows[0].lesson; live = rows[4].lesson;
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons.length, 0);
  await assert.rejects(() => createLessons(db, "owner", course.id, "template"));
  assert.equal((await ownerLessons(db, course.id)).length, 5);
});

test("publishing requires a ready signed video or a dated live session with a meeting number", async () => {
  await assert.rejects(() => updateLesson(db, "owner", input(video)), /videoyu/);
  await assert.rejects(() => updateLesson(db, "owner", input(live)), /geçerli/);
  await assert.rejects(() => updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", meetingId: "javascript:alert(1)" })), /haneli/);
  const [asset] = await db.insert(schema.videoAssets).values({ muxAssetId: "asset-1", signedPlaybackId: "signed-1", status: "ready", durationSeconds: 120 }).returning();
  await db.update(schema.lessons).set({ videoAssetId: asset.id }).where(eq(schema.lessons.id, video.id));
  await updateLesson(db, "owner", input(video));
  await updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", meetingId: "852-901-5944", passcode: "secret" }));
  const result = await studentCourse(db, "buyer", course.id, now);
  assert.equal(result.lessons.length, 2);
  assert.equal(result.lessons[1].startsAt.toISOString(), now.toISOString(), "editor dates use Istanbul time");
  const serialized = JSON.stringify(result);
  for (const secret of ["secret", "8529015944", "signed-1", "asset-1"]) assert.ok(!serialized.includes(secret), "course page does not expose media credentials");
});

test("unpaid and expired users cannot read lessons or write progress", async () => {
  assert.equal(await studentCourse(db, "other", course.id, now), null);
  assert.equal(await accessibleLesson(db, "other", video.id, now), null);
  await assert.rejects(() => saveProgress(db, "other", video.id, { completed: true }, now), /FORBIDDEN/);
  assert.equal(await studentCourse(db, "buyer", course.id, new Date("2026-09-24")), null);
  await assert.rejects(() => saveProgress(db, "buyer", video.id, { completed: true }, new Date("2026-09-24")), /FORBIDDEN/);
});

test("a video completes only once 90% is watched; completion persists and can be undone", async () => {
  await assert.rejects(() => saveProgress(db, "buyer", video.id, { completed: true, position: 107 }, now), /NOT_WATCHED/);
  await saveProgress(db, "buyer", video.id, { completed: true, position: 108 }, now);
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
  assert.deepEqual(await liveDestination(db, "buyer", live.id, now), { meetingId: "8529015944", passcode: "secret" });
  assert.equal(await liveDestination(db, "buyer", live.id, new Date("2026-09-23T10:30:00Z")), null);
  await updateLesson(db, "owner", input(live, { startsAt: "2026-09-23T12:00", meetingId: "852-901-5944", liveStatus: "cancelled" }));
  assert.equal(await liveDestination(db, "buyer", live.id, now), null);
});

test("a live lesson's recording can be attached, and attendance is marked without watching it", async () => {
  const view = async () => { const lesson = (await studentCourse(db, "buyer", course.id, now)).lessons.find(lesson => lesson.id === live.id); return [lesson.liveView, lesson.daysLeft]; };
  await updateLesson(db, "owner", input(live, { startsAt: "2026-09-25T00:30", meetingId: "8529015944" }));
  assert.deepEqual(await view(), ["upcoming", 2]);
  await attachAsset(db, "owner", live, { muxAssetId: "recording-1", signedPlaybackId: "recording-signed", durationSeconds: 3600 }, "Kayıt");
  assert.deepEqual(await view(), ["recorded", null]);
  assert.equal(await liveDestination(db, "buyer", live.id, new Date("2026-09-24T21:15:00Z")), null, "no join links once the recording is up");
  await saveProgress(db, "buyer", live.id, { completed: true }, now);
  await db.delete(schema.lessonProgress).where(eq(schema.lessonProgress.lessonId, live.id));
});

test("lesson notes are rich text: old plain notes become paragraphs and unsafe markup is dropped", async () => {
  assert.equal(plainToHtml("Bir\nİki\n\nÜç <b>"), "<p>Bir<br>İki</p><p>Üç &lt;b&gt;</p>");
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons[0].description, "<p>Lesson notes</p>");
  await updateLesson(db, "owner", input(video, { description: '<h2 class="x">Hazırlık</h2><p onclick="x()">Su <strong>getirin</strong><script>alert(1)</script><img src="https://a/b.png"></p>' }));
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons[0].description, "<h2>Hazırlık</h2><p>Su <strong>getirin</strong></p>");
  await updateLesson(db, "owner", input(video, { description: "<p><br></p>" }));
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons[0].description, "", "an empty editor saves no notes");
});

test("course pages find a course by slug, and by id for old links", async () => {
  assert.equal((await courseForRoute(db, "test-course")).id, course.id);
  assert.equal((await courseForRoute(db, course.id)).slug, "test-course");
  assert.equal(await courseForRoute(db, "yok"), null);
});

test("Zoom links carry the meeting, its passcode and the student's own name", () => {
  assert.equal(zoomMeetingId("852 901-5944"), "8529015944");
  for (const bad of ["", "12345678", "https://zoom.us/j/8529015944", "javascript:alert(1)"]) assert.equal(zoomMeetingId(bad), "");
  assert.deepEqual(zoomLinks("8529015944", "a&b", "Ayşe Yılmaz"), {
    desktop: "zoommtg://zoom.us/join?confno=8529015944&pwd=a%26b&uname=Ay%C5%9Fe%20Y%C4%B1lmaz",
    mobile: "zoomus://zoom.us/join?confno=8529015944&pwd=a%26b&uname=Ay%C5%9Fe%20Y%C4%B1lmaz",
    web: "https://zoom.us/j/8529015944", passcode: "a&b",
  });
  assert.ok(!zoomLinks("8529015944", "", "A").desktop.includes("pwd"));
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

test("attaching a library video makes it ready, reuses the asset row, and is audited", async () => {
  const [first, second] = (await ownerLessons(db, course.id)).filter(row => row.lesson.kind === "video").map(row => row.lesson);
  const video = { muxAssetId: "library-asset", signedPlaybackId: "library-signed", durationSeconds: 87, aspectRatio: "16:9" };
  await attachAsset(db, "owner", first, video, "Mux kütüphanesinden video bağlandı");
  await attachAsset(db, "owner", second, video, "Mux kütüphanesinden video bağlandı");
  const rows = (await ownerLessons(db, course.id)).filter(row => [first.id, second.id].includes(row.lesson.id));
  assert.equal(new Set(rows.map(row => row.asset.id)).size, 1);
  assert.deepEqual([rows[0].asset.status, rows[0].asset.durationSeconds], ["ready", 87]);
  const audits = await db.select().from(schema.adminAuditLog).where(eq(schema.adminAuditLog.action, "video.attach"));
  assert.equal(audits.length, 2);
});

test("reordering saves the full new order, rejects a stale list, and is audited", async () => {
  const ids = (await ownerLessons(db, course.id)).map(row => row.lesson.id);
  const reversed = [...ids].reverse();
  await reorderLessons(db, "owner", course.id, reversed);
  assert.deepEqual((await ownerLessons(db, course.id)).map(row => row.lesson.id), reversed);
  await assert.rejects(() => reorderLessons(db, "owner", course.id, reversed.slice(1)), /değişmiş/);
  await assert.rejects(() => reorderLessons(db, "owner", course.id, [...reversed.slice(1), reversed[1]]), /değişmiş/);
  assert.equal((await db.select().from(schema.adminAuditLog).where(eq(schema.adminAuditLog.action, "lesson.reorder"))).length, 1);
});

test("deleting a draft or published lesson removes it with its live session and progress, and is audited", async () => {
  await createLessons(db, "owner", course.id, "live");
  const rows = await ownerLessons(db, course.id);
  const [draft, published] = [rows.at(-1).lesson, rows.find(row => row.lesson.status === "published").lesson];
  await db.insert(schema.liveSessions).values({ lessonId: draft.id, startsAt: now, durationMinutes: 60, zoomMeetingId: "8529015944", zoomPasscode: "" });
  await db.insert(schema.lessonProgress).values([draft, published].map(lesson => ({ userId: "buyer", lessonId: lesson.id })));
  await assert.rejects(() => deleteLesson(db, "owner", crypto.randomUUID(), draft.id), /bulunamadı/);
  for (const lesson of [draft, published]) await deleteLesson(db, "owner", course.id, lesson.id);
  const remaining = (await ownerLessons(db, course.id)).map(row => row.lesson.id);
  assert.deepEqual(remaining, rows.map(row => row.lesson.id).filter(id => id !== draft.id && id !== published.id));
  assert.equal((await studentCourse(db, "buyer", course.id, now)).lessons.some(row => row.id === published.id), false);
  assert.equal((await db.select().from(schema.adminAuditLog).where(eq(schema.adminAuditLog.action, "lesson.delete"))).length, 2);
});

const homework = (lessonId, n) => ({ lessonId, name: `Ödev ${n}.pdf`, pathname: `lessons/${lessonId}/d${n}/odev-${n}.pdf`, mime: "application/pdf", sizeBytes: 120_000 });

test("an audio lesson publishes only with a ready recording, which students finish by listening", async () => {
  await createLessons(db, "owner", course.id, "audio");
  const audio = (await ownerLessons(db, course.id)).at(-1).lesson;
  assert.deepEqual([audio.kind, audio.status, audio.title.endsWith("ses dersi")], ["audio", "draft", true]);
  await assert.rejects(() => updateLesson(db, "owner", input(audio)), /ses kaydını/);
  const peaks = [10, 80, 40, 100, 0, 55, 20, 90];
  await attachAsset(db, "owner", audio, { muxAssetId: "recording-1", signedPlaybackId: "recording-signed-1", durationSeconds: 600, peaks }, "Yüklenen ses kaydı derse bağlandı");
  await updateLesson(db, "owner", input(audio));

  const lesson = (await studentCourse(db, "buyer", course.id, now)).lessons.find(row => row.id === audio.id);
  assert.deepEqual([lesson.kind, lesson.durationSeconds, lesson.mediaReady, lesson.peaks], ["audio", 600, true, peaks]);
  assert.ok(!JSON.stringify(lesson).includes("recording-"), "Mux identifiers never reach the course page");
  await assert.rejects(() => saveProgress(db, "buyer", audio.id, { completed: true, position: 500 }, now), /NOT_WATCHED/);
  await saveProgress(db, "buyer", audio.id, { completed: true, position: 540 }, now);

  // Re-attaching the same asset keeps its waveform; a new asset has none.
  await attachAsset(db, "owner", audio, { muxAssetId: "recording-1", signedPlaybackId: "recording-signed-1", durationSeconds: 600 }, "Mux kütüphanesinden ses kaydı bağlandı");
  assert.deepEqual((await ownerLessons(db, course.id)).find(row => row.lesson.id === audio.id).asset.peaks, peaks);
  await attachAsset(db, "owner", audio, { muxAssetId: "recording-2", signedPlaybackId: "recording-signed-2", durationSeconds: 300 }, "Mux kütüphanesinden ses kaydı bağlandı");
  assert.equal((await db.select().from(schema.adminAuditLog).where(eq(schema.adminAuditLog.action, "audio.attach"))).length, 3);
  const replaced = (await studentCourse(db, "buyer", course.id, now)).lessons.find(row => row.id === audio.id);
  assert.deepEqual([replaced.durationSeconds, replaced.peaks], [300, null]);
});

test("homework PDFs attach to any lesson and open only for students with access to a published lesson", async () => {
  const rows = await ownerLessons(db, course.id);
  const lesson = rows.find(row => row.lesson.kind === "video").lesson;
  await db.update(schema.modules).set({ status: "published" }).where(eq(schema.modules.id, lesson.moduleId));
  const [asset] = await db.select().from(schema.videoAssets).limit(1);
  await db.update(schema.lessons).set({ videoAssetId: asset.id, status: "published" }).where(eq(schema.lessons.id, lesson.id));
  const one = await addLessonFile(db, "owner", homework(lesson.id, 1));
  const two = await addLessonFile(db, "owner", homework(lesson.id, 2));
  await assert.rejects(() => addLessonFile(db, "owner", { ...homework(lesson.id, 3), mime: "application/zip" }), /PDF olmalıdır/);
  await assert.rejects(() => addLessonFile(db, "owner", { ...homework(lesson.id, 3), sizeBytes: 30 * 1024 * 1024 }), /çok büyük/);
  assert.equal((await addLessonFile(db, "owner", { ...homework(lesson.id, 3), name: ` ${"a".repeat(300)}.pdf ` })).file.name.length, 160, "a long file name is cut, not refused");
  await removeLessonFile(db, "owner", (await db.select().from(schema.lessonFiles).where(eq(schema.lessonFiles.pathname, homework(lesson.id, 3).pathname)))[0].id);
  await assert.rejects(() => addLessonFile(db, "owner", homework(crypto.randomUUID(), 1)), /bulunamadı/);

  const shown = (await studentCourse(db, "buyer", course.id, now)).lessons.find(row => row.id === lesson.id);
  assert.deepEqual(shown.documents, [{ id: one.file.id, name: "Ödev 1.pdf", sizeBytes: 120_000 }, { id: two.file.id, name: "Ödev 2.pdf", sizeBytes: 120_000 }]);
  assert.ok(!JSON.stringify(shown).includes("lessons/"), "storage paths never reach the course page");
  assert.equal((await accessibleFile(db, "buyer", one.file.id, now)).pathname, one.file.pathname);
  assert.equal(await accessibleFile(db, "other", one.file.id, now), null, "no grant");
  assert.equal(await accessibleFile(db, "buyer", one.file.id, new Date("2026-09-24")), null, "expired grant");
  assert.equal(await accessibleFile(db, "buyer", crypto.randomUUID(), now), null);
  await db.update(schema.lessons).set({ status: "draft" }).where(eq(schema.lessons.id, lesson.id));
  assert.equal(await accessibleFile(db, "buyer", one.file.id, now), null, "draft lesson");

  assert.equal((await removeLessonFile(db, "owner", one.file.id)).pathname, one.file.pathname);
  await assert.rejects(() => removeLessonFile(db, "owner", one.file.id), /bulunamadı/);
  assert.deepEqual(await deleteLesson(db, "owner", course.id, lesson.id), [two.file.pathname], "deleting a lesson hands back its stored files");
  assert.equal((await db.select().from(schema.lessonFiles).where(eq(schema.lessonFiles.lessonId, lesson.id))).length, 0);
  const actions = (await db.select().from(schema.adminAuditLog)).map(row => row.action);
  for (const action of ["file.add", "file.remove"]) assert.ok(actions.includes(action), action);
});
