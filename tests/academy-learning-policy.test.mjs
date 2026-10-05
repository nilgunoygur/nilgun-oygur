import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";
import { activeCourseAccess, activeGrant, recordShopierOrder } from "../lib/akademi/course-access.ts";
import { accessibleLesson, accessibleFile, liveDestination, saveProgress, studentCourse } from "../lib/akademi/learning.ts";
import { requestRefund, latestRefundRequest } from "../lib/akademi/refund-requests.ts";
import { decideRefundRequest } from "../lib/akademi/owner-commands.ts";
import { shopierOrderSchema, shopierRefundSchema } from "../lib/shopier/api.ts";
import { lessonPrerequisites } from "../lib/akademi/lesson-sequence.ts";

const client = new PGlite(), db = drizzle(client, { schema });
const now = new Date("2026-10-05T12:00:00Z");
let sequence = 800000000;
before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values({ id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true });
  await db.insert(schema.owners).values({ userId: "owner" });
});
after(() => client.close());
async function fixture() {
  const id = String(sequence++);
  await db.insert(schema.user).values({ id, name: "Student", email: `${id}@example.com`, emailVerified: true });
  const [course] = await db.insert(schema.courses).values({ slug: `course-${id}`, shopierProductId: id, accessDurationDays: 30 }).returning();
  const order = (date = "2026-10-01T12:00:00Z") => shopierOrderSchema.parse({ id: String(sequence++), paymentStatus: "paid", dateCreated: date, currency: "TRY", billingInfo: { email: `${id}@example.com` }, lineItems: [{ productId: id, total: "100.00" }] });
  await recordShopierOrder(db, order());
  const [module] = await db.insert(schema.modules).values({ courseId: course.id, title: "Module", status: "published" }).returning();
  const [asset] = await db.insert(schema.videoAssets).values({ muxAssetId: id, signedPlaybackId: id, status: "ready", durationSeconds: 100 }).returning();
  const steps = await db.insert(schema.lessons).values(["video", "live", "audio", "video"].map((kind, position) => ({ courseId: course.id, moduleId: module.id, title: `Step ${position + 1}`, slug: `step-${position + 1}`, kind, position, status: "published", videoAssetId: kind === "live" ? null : asset.id }))).returning();
  await db.insert(schema.liveSessions).values({ lessonId: steps[1].id, startsAt: now, durationMinutes: 60, zoomMeetingId: "8529015944", zoomPasscode: "" });
  const [file] = await db.insert(schema.lessonFiles).values({ lessonId: steps[2].id, name: "Material.pdf", pathname: `${id}.pdf`, mime: "application/pdf", sizeBytes: 100 }).returning();
  return { id, course, steps, file, order };
}

test("all published lessons are listed but recordings and PDFs require preceding recordings; live lessons are exempt", async () => {
  const f = await fixture(), [first, live, second, third] = f.steps;
  const shown = await studentCourse(db, f.id, f.course.id, now);
  assert.equal(shown.lessons.length, 4);
  assert.equal(lessonPrerequisites(shown.lessons, new Set()).get(second.id).id, first.id);
  assert.ok(await accessibleLesson(db, f.id, first.id, now));
  assert.equal(await accessibleLesson(db, f.id, second.id, now), null);
  assert.equal(await accessibleFile(db, f.id, f.file.id, now), null);
  await assert.rejects(() => saveProgress(db, f.id, second.id, { completed: true, position: 100 }, now), /FORBIDDEN/);
  assert.ok(await liveDestination(db, f.id, live.id, now), "Zoom ignores prerequisites");
  await saveProgress(db, f.id, first.id, { completed: true, position: 100 }, now);
  assert.ok(await accessibleLesson(db, f.id, second.id, now), "unfinished Zoom does not block the next recording");
  assert.ok(await accessibleFile(db, f.id, f.file.id, now));
  assert.equal(await accessibleLesson(db, f.id, third.id, now), null);
  await saveProgress(db, f.id, second.id, { completed: true, position: 100 }, now);
  assert.ok(await accessibleLesson(db, f.id, third.id, now));
  await saveProgress(db, f.id, first.id, { completed: false }, now);
  assert.equal(await accessibleLesson(db, f.id, third.id, now), null, "undoing a prerequisite blocks later direct requests again");
});

test("a refund request suspends all content; rejection restores access; approval removes the course and repurchase starts fresh", async () => {
  const f = await fixture(), [first, live] = f.steps;
  await saveProgress(db, f.id, first.id, { completed: true, position: 100 }, now);
  await requestRefund(db, f.id, f.course.id, "Please refund");
  const [request] = await db.select().from(schema.refundRequests).where(eq(schema.refundRequests.userId, f.id));
  assert.equal(await activeGrant(db, f.id, f.course.id, now), null);
  assert.equal((await activeCourseAccess(db, f.id, now))[0].refundPending, true, "the account retains a suspended card with request status");
  assert.equal(await studentCourse(db, f.id, f.course.id, now), null);
  assert.equal(await accessibleLesson(db, f.id, first.id, now), null);
  assert.equal(await liveDestination(db, f.id, live.id, now), null, "Zoom is also blocked by a refund");
  assert.equal(await accessibleFile(db, f.id, f.file.id, now), null);
  await assert.rejects(() => saveProgress(db, f.id, first.id, { position: 100 }, now), /FORBIDDEN/);
  await decideRefundRequest(db, "owner", request.id, { approve: false, note: "Declined" }, {});
  assert.ok(await activeGrant(db, f.id, f.course.id, now));
  await requestRefund(db, f.id, f.course.id, "Reconsider");
  const requests = await db.select().from(schema.refundRequests).where(eq(schema.refundRequests.userId, f.id));
  const pending = requests.find(row => row.status === "pending");
  await decideRefundRequest(db, "owner", pending.id, { approve: true, amountKurus: 10000, note: "" }, { createRefund: async () => shopierRefundSchema.parse({ id: "refund-accepted", orderId: "1", status: "pending", type: "full", dateCreated: now.toISOString(), dateRefunded: "", currency: "TRY", total: "100.00" }) });
  assert.deepEqual(await activeCourseAccess(db, f.id, now), []);
  assert.equal(await activeGrant(db, f.id, f.course.id, now), null);
  const paidAgain = f.order(now.toISOString());
  await recordShopierOrder(db, paidAgain);
  const restored = await activeGrant(db, f.id, f.course.id, now);
  assert.equal(restored.startsAt.toISOString(), now.toISOString(), "a refund-approved purchase cannot extend the next purchase");
  assert.equal(await latestRefundRequest(db, f.id, f.course.id), null, "the old refund cannot hide the new purchase");
});
