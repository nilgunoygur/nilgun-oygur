import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, max, or } from "drizzle-orm";
import { courseAccess, owners, session, user } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { hasActiveAccess } from "./access-policy.ts";

// Owner Users: a read-only account list for the owner. Owner rights come only from the protected owners
// table and are never granted from the app, so this module has no write side.

export type UserRole = "owner" | "student";
export type UserListParams = { role?: string; q?: string; page?: string };
export const USERS_PER_PAGE = 25;

export function userListFilter(params: UserListParams) {
  const role: UserRole | null = params.role === "owner" || params.role === "student" ? params.role : null;
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);
  return { role, q: (params.q ?? "").trim().slice(0, 100), page };
}

export async function ownerUsers(db: Database, params: UserListParams, now: Date) {
  const filter = userListFilter(params);
  const pattern = `%${filter.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(
    filter.role === "owner" ? isNotNull(owners.userId) : filter.role === "student" ? isNull(owners.userId) : undefined,
    filter.q ? or(ilike(user.email, pattern), ilike(user.name, pattern)) : undefined,
  );
  const [[totals], [{ matching }]] = await Promise.all([
    db.select({ all: count(), owners: count(owners.userId) }).from(user).leftJoin(owners, eq(owners.userId, user.id)),
    db.select({ matching: count() }).from(user).leftJoin(owners, eq(owners.userId, user.id)).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(matching / USERS_PER_PAGE));
  const page = Math.min(filter.page, pages);
  const rows = await db.select({
    id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt, owner: isNotNull(owners.userId).mapWith(Boolean),
  }).from(user).leftJoin(owners, eq(owners.userId, user.id)).where(where)
    .orderBy(desc(user.createdAt), user.id).limit(USERS_PER_PAGE).offset((page - 1) * USERS_PER_PAGE);

  const ids = rows.map(row => row.id);
  const [grants, sessions] = ids.length ? await Promise.all([
    db.select({ userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt, expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt })
      .from(courseAccess).where(and(inArray(courseAccess.userId, ids), isNull(courseAccess.revokedAt))),
    // Expired sessions are deleted, so this is the latest activity still on record, not a full sign-in history.
    db.select({ userId: session.userId, at: max(session.updatedAt) }).from(session).where(inArray(session.userId, ids)).groupBy(session.userId),
  ]) : [[], []];
  const lastSeen = new Map(sessions.map(item => [item.userId, item.at]));

  return {
    filter: { ...filter, page },
    counts: { all: totals.all, owner: totals.owners, student: totals.all - totals.owners },
    matching,
    pages,
    users: rows.map(row => ({
      ...row,
      lastSeenAt: lastSeen.get(row.id) ?? null,
      activeCourses: grants.filter(grant => hasActiveAccess(grant, row.id, grant.courseId, now)).length,
    })),
  };
}
