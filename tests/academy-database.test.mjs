import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/db/schema.ts";

const client = new PGlite();
const db = drizzle(client);
let courseA, courseB, moduleA, orderA, orderB;
const paidAt = new Date("2026-09-15T12:00:00Z");
const expiresAt = new Date("2027-09-15T12:00:00Z");
const rejectsConstraint = (operation, code) => assert.rejects(operation, (error) => (error.cause?.code ?? error.code) === code);

before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  // Running a second time must be safe.
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values([
    { id: "student-a", name: "A", email: "a@example.com" },
    { id: "student-b", name: "B", email: "b@example.com" },
    { id: "owner", name: "Owner", email: "owner@example.com" },
  ]);
  await db.insert(schema.owners).values({ userId: "owner" });
  [courseA, courseB] = await db.insert(schema.courses).values([
    { slug: "course-a", shopierProductId: "1001001" },
    { slug: "course-b", shopierProductId: "1001002" },
  ]).returning();
  [moduleA] = await db.insert(schema.modules).values({ courseId: courseA.id, title: "Module A" }).returning();
  // Two claimed Shopier purchases of course A by student A (an original and a renewal).
  [orderA, orderB] = await db.insert(schema.shopierPurchases).values(["1001", "1002"].map(shopierOrderId => ({
    shopierOrderId, courseId: courseA.id, buyerEmail: "a@example.com", amountKurus: 10000, currency: "TRY",
    accessDurationDays: 365, purchasedAt: paidAt, userId: "student-a", claimedAt: paidAt,
  }))).returning();
});
after(async () => { await client.close(); });

test("courses need a unique Shopier product and a positive access duration", async () => {
  await rejectsConstraint(() => db.insert(schema.courses).values({ slug: "bad", shopierProductId: "1001009", accessDurationDays: 0 }), "23514");
  await rejectsConstraint(() => db.insert(schema.courses).values({ slug: "unlinked" }), "23502");
  await rejectsConstraint(() => db.insert(schema.courses).values({ slug: "duplicate", shopierProductId: "1001001" }), "23505");
  await rejectsConstraint(() => db.insert(schema.shopierPurchases).values({ shopierOrderId: "1001", courseId: courseA.id, buyerEmail: "x@example.com", amountKurus: 1, currency: "TRY", accessDurationDays: 1, purchasedAt: paidAt }), "23505");
  await rejectsConstraint(() => db.insert(schema.shopierPurchases).values({ shopierOrderId: "1003", courseId: courseA.id, buyerEmail: "x@example.com", amountKurus: 1, currency: "TRY", accessDurationDays: 1, purchasedAt: paidAt, userId: "student-a" }), "23514");
});

test("a lesson cannot borrow another course's module or duplicate a course slug", async () => {
  const lesson = { moduleId: moduleA.id, courseId: courseA.id, title: "Lesson", slug: "lesson", kind: "video" };
  await db.insert(schema.lessons).values(lesson);
  await rejectsConstraint(() => db.insert(schema.lessons).values({ ...lesson, courseId: courseB.id }), "23503");
  await rejectsConstraint(() => db.insert(schema.lessons).values(lesson), "23505");
  await rejectsConstraint(() => db.insert(schema.lessons).values({ ...lesson, slug: "no-asset", status: "published" }), "23514");
});

test("live sessions cannot attach to recorded-video lessons", async () => {
  const [video] = await db.insert(schema.lessons).values({ moduleId: moduleA.id, courseId: courseA.id, title: "Video", slug: "video-only", kind: "video" }).returning();
  await rejectsConstraint(() => db.insert(schema.liveSessions).values({ lessonId: video.id, startsAt: paidAt, durationMinutes: 60, zoomJoinUrl: "https://zoom.us/j/example", zoomPasscode: "test" }), "23503");
});

test("purchase grants must match both the purchase's student and course", async () => {
  const grant = { sourcePurchaseId: orderA.id, userId: "student-a", courseId: courseA.id, startsAt: paidAt, expiresAt };
  await rejectsConstraint(() => db.insert(schema.courseAccess).values({ ...grant, userId: "student-b" }), "23503");
  await rejectsConstraint(() => db.insert(schema.courseAccess).values({ ...grant, courseId: courseB.id }), "23503");
  await rejectsConstraint(() => db.insert(schema.courseAccess).values({ ...grant, sourcePurchaseId: null }), "23514");
});

test("renewal retires the previous grant and replay cannot grant the same purchase twice", async () => {
  const grant = { sourcePurchaseId: orderA.id, userId: "student-a", courseId: courseA.id, startsAt: paidAt, expiresAt };
  await db.insert(schema.courseAccess).values(grant);
  const renewal = { ...grant, sourcePurchaseId: orderB.id, startsAt: expiresAt, expiresAt: new Date("2028-09-15T12:00:00Z") };
  // Even an expired row occupies the unrevoked index, so fulfillment must retire it.
  await rejectsConstraint(() => db.insert(schema.courseAccess).values(renewal), "23505");
  await db.transaction(async tx => {
    await tx.update(schema.courseAccess).set({ revokedAt: expiresAt, revocationReason: "expired_replaced" });
    await tx.insert(schema.courseAccess).values(renewal);
  });
  await rejectsConstraint(() => db.insert(schema.courseAccess).values({ ...grant, revokedAt: expiresAt, revocationReason: "replay" }), "23505");
});

test("owner grants require an owner and a meaningful reason", async () => {
  const grant = { userId: "student-b", courseId: courseB.id, grantedBy: "owner", startsAt: paidAt, expiresAt };
  await rejectsConstraint(() => db.insert(schema.courseAccess).values(grant), "23514");
  await rejectsConstraint(() => db.insert(schema.courseAccess).values({ ...grant, grantedBy: "student-a", grantReason: "test" }), "23503");
  await db.insert(schema.courseAccess).values({ ...grant, grantReason: "Rehearsal invitation" });
});

test("provider event deduplication is scoped by provider", async () => {
  const event = { provider: "shopier", eventIdentity: "payment-1", verifiedPayloadHash: "verified-hash" };
  await db.insert(schema.providerEvents).values(event);
  await rejectsConstraint(() => db.insert(schema.providerEvents).values(event), "23505");
  await db.insert(schema.providerEvents).values({ ...event, provider: "mux" });
});
