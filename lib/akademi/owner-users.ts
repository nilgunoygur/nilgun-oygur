import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, max, or, sql } from "drizzle-orm";
import { courseAccess, owners, session, user } from "../db/schema.ts";
import { containsPattern } from "../db/search.ts";
import type { Database } from "../db/types.ts";
import { hasActiveAccess } from "./access-policy.ts";
import { contactColumns } from "./student-contact.ts";
import { matchProvince } from "../turkiye.ts";

// Read-only: owner rights come only from the protected owners table.

export type UserRole = "owner" | "student";
export type UserListParams = { role?: string; q?: string; page?: string };
const perPage = 25;

export function userListFilter(params: UserListParams) {
  const role: UserRole | null = params.role === "owner" || params.role === "student" ? params.role : null;
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);
  return { role, q: (params.q ?? "").trim().slice(0, 100), page };
}

export async function ownerUsers(db: Database, params: UserListParams, now: Date) {
  const filter = userListFilter(params);
  const pattern = containsPattern(filter.q);
  // Phones (stored E.164) match by digits.
  const digits = filter.q.replace(/\D/g, "").replace(/^0+/, "");
  // ILIKE never maps ı to i, so "igdir" also matches the recognized province.
  const province = matchProvince(filter.q);
  const where = and(
    filter.role === "owner" ? isNotNull(owners.userId) : filter.role === "student" ? isNull(owners.userId) : undefined,
    filter.q ? or(ilike(user.email, pattern), ilike(user.name, pattern), ilike(user.city, pattern), province ? eq(user.city, province) : undefined, digits.length >= 3 ? ilike(user.phone, `%${digits}%`) : undefined) : undefined,
  );
  const rowsOf = (page: number) => db.select({
    id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt, owner: isNotNull(owners.userId).mapWith(Boolean),
    ...contactColumns,
  }).from(user).leftJoin(owners, eq(owners.userId, user.id)).where(where)
    .orderBy(desc(user.createdAt), user.id).limit(perPage).offset((page - 1) * perPage);

  const [[totals], requested] = await Promise.all([
    db.select({ all: count(), owners: count(owners.userId), matching: sql<number>`count(*) filter (where ${where ?? sql`true`})`.mapWith(Number) })
      .from(user).leftJoin(owners, eq(owners.userId, user.id)),
    rowsOf(filter.page),
  ]);
  const pages = Math.max(1, Math.ceil(totals.matching / perPage));
  const page = Math.min(filter.page, pages);
  const rows = page === filter.page ? requested : await rowsOf(page);

  const ids = rows.map(row => row.id);
  const [grants, sessions] = ids.length ? await Promise.all([
    db.select({ userId: courseAccess.userId, courseId: courseAccess.courseId, startsAt: courseAccess.startsAt, expiresAt: courseAccess.expiresAt, revokedAt: courseAccess.revokedAt })
      .from(courseAccess).where(and(inArray(courseAccess.userId, ids), isNull(courseAccess.revokedAt))),
    // Expired sessions are deleted, so this is the latest activity still on record.
    db.select({ userId: session.userId, at: max(session.updatedAt) }).from(session).where(inArray(session.userId, ids)).groupBy(session.userId),
  ]) : [[], []];
  const lastSeen = new Map(sessions.map(item => [item.userId, item.at]));

  return {
    filter: { ...filter, page },
    counts: { all: totals.all, owner: totals.owners, student: totals.all - totals.owners },
    matching: totals.matching,
    pages,
    users: rows.map(row => ({
      ...row,
      lastSeenAt: lastSeen.get(row.id) ?? null,
      activeCourses: grants.filter(grant => grant.userId === row.id && hasActiveAccess(grant, row.id, grant.courseId, now)).length,
    })),
  };
}
