import test from "node:test";
import assert from "node:assert/strict";
import { hasActiveAccess, playbackExpiresAt, canJoinLiveSession, accessExpiryFromPayment } from "../lib/akademi/access-policy.ts";

const now = new Date("2026-09-15T12:00:00Z");
const grant = { userId: "student-a", courseId: "course-a", startsAt: now, expiresAt: new Date("2027-09-15T12:00:00Z"), revokedAt: null };

test("access is buyer/course specific, starts inclusively, and expires exclusively", () => {
  assert.equal(hasActiveAccess(grant, "student-a", "course-a", now), true);
  for (const [candidate, user, course, time] of [
    [null, "student-a", "course-a", now],
    [grant, null, "course-a", now],
    [grant, "student-b", "course-a", now],
    [grant, "student-a", "course-b", now],
    [grant, "student-a", "course-a", new Date(now.getTime() - 1)],
    [grant, "student-a", "course-a", grant.expiresAt],
    [{ ...grant, revokedAt: now }, "student-a", "course-a", now],
  ]) assert.equal(hasActiveAccess(candidate, user, course, time), false);
});

test("playback renewal rechecks revocation and never exceeds ten minutes or expiry", () => {
  assert.equal(playbackExpiresAt(grant, "student-a", "course-a", now), now.getTime() / 1000 + 600);
  const short = { ...grant, expiresAt: new Date(now.getTime() + 15_999) };
  assert.equal(playbackExpiresAt(short, "student-a", "course-a", now), now.getTime() / 1000 + 15);
  assert.equal(playbackExpiresAt({ ...grant, revokedAt: now }, "student-a", "course-a", now), null);
  assert.equal(playbackExpiresAt(grant, "student-b", "course-a", now), null);
  assert.equal(playbackExpiresAt(short, "student-a", "course-a", short.expiresAt), null);
  assert.equal(playbackExpiresAt({ ...grant, expiresAt: new Date(now.getTime() + 999) }, "student-a", "course-a", now), null);
});

test("live joins require active access throughout the bounded window", () => {
  const live = { startsAt: new Date("2026-09-15T13:00:00Z"), durationMinutes: 60, status: "scheduled" };
  const canJoinAt = (iso, session = live, access = grant) => canJoinLiveSession(session, access, "student-a", "course-a", new Date(iso));
  assert.equal(canJoinAt("2026-09-15T12:29:59.999Z"), false);
  assert.equal(canJoinAt("2026-09-15T12:30:00Z"), true);
  assert.equal(canJoinAt("2026-09-15T14:29:59.999Z"), true);
  assert.equal(canJoinAt("2026-09-15T14:30:00Z"), false);
  assert.equal(canJoinAt("2026-09-15T13:00:00Z", { ...live, status: "cancelled" }), false);
  assert.equal(canJoinAt("2026-09-15T13:00:00Z", { ...live, status: "completed" }), false);
  assert.equal(canJoinAt("2026-09-15T13:00:00Z", { ...live, status: "rescheduled" }), true);
  assert.equal(canJoinAt("2026-09-15T13:00:00Z", live, null), false);
  assert.equal(canJoinAt("2026-09-15T13:00:00Z", live, { ...grant, expiresAt: live.startsAt }), false);
});

test("access duration is elapsed UTC days from confirmed payment", () => {
  assert.equal(accessExpiryFromPayment(now, 365).toISOString(), "2027-09-15T12:00:00.000Z");
  assert.equal(accessExpiryFromPayment(new Date("2028-02-28T12:00:00Z"), 2).toISOString(), "2028-03-01T12:00:00.000Z");
  for (const days of [0, -1, 1.5, NaN, Infinity, Number.MAX_VALUE]) assert.throws(() => accessExpiryFromPayment(now, days));
});
