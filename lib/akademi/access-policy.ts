/** Pure rules for server callers. IDs and grants must come from a verified session/database. */
export type AccessGrant = {
  userId: string;
  courseId: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function hasActiveAccess(
  grant: AccessGrant | null,
  userId: string | null,
  courseId: string,
  now: Date,
): boolean {
  return !!grant && !!userId && grant.userId === userId && grant.courseId === courseId
    && grant.revokedAt === null
    && grant.startsAt.getTime() <= now.getTime()
    && now.getTime() < grant.expiresAt.getTime();
}

/** Whole-second JWT expiry, rounded down so it never extends past the grant. */
export function playbackExpiresAt(
  grant: AccessGrant | null,
  userId: string | null,
  courseId: string,
  now: Date,
): number | null {
  if (!grant || !hasActiveAccess(grant, userId, courseId, now)) return null;
  const expiresAt = Math.floor(Math.min(now.getTime() + 600_000, grant.expiresAt.getTime()) / 1000);
  return expiresAt > now.getTime() / 1000 ? expiresAt : null;
}

export type LiveSession = {
  startsAt: Date;
  durationMinutes: number;
  status: "scheduled" | "rescheduled" | "cancelled" | "completed";
};

export function canJoinLiveSession(
  live: LiveSession,
  grant: AccessGrant | null,
  userId: string | null,
  courseId: string,
  now: Date,
): boolean {
  if (!hasActiveAccess(grant, userId, courseId, now)) return false;
  if (live.status !== "scheduled" && live.status !== "rescheduled") return false;
  if (!Number.isInteger(live.durationMinutes) || live.durationMinutes <= 0) return false;
  const start = live.startsAt.getTime();
  return now.getTime() >= start - 30 * 60_000
    && now.getTime() < start + (live.durationMinutes + 30) * 60_000;
}

export function accessExpiryFromPayment(paidAt: Date, accessDurationDays: number): Date {
  if (!Number.isInteger(accessDurationDays) || accessDurationDays <= 0 || !Number.isFinite(paidAt.getTime())) {
    throw new Error("A valid payment time and positive whole-day access duration are required.");
  }
  const expiry = new Date(paidAt.getTime() + accessDurationDays * 86_400_000);
  if (!Number.isFinite(expiry.getTime())) throw new Error("Access expiry is outside the supported date range.");
  return expiry;
}
