import { eq } from "drizzle-orm";
import { adminAuditLog, courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";

// Owner Commands: every owner change runs with its audit entry in one transaction, and only when something changed.
// Callers authorize the owner (verified session and owner row) before calling.

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type AuditEntry = { action: string; resourceType: string; resourceId: string; reason: string };

async function audited(db: Database, actorId: string, entry: AuditEntry, change: (tx: Transaction) => Promise<boolean>) {
  if (!entry.reason.trim()) throw new Error("Owner changes require a reason.");
  return db.transaction(async (tx) => {
    if (!await change(tx)) return false;
    await tx.insert(adminAuditLog).values({ actorId, ...entry });
    return true;
  });
}

export type CourseStatus = typeof courses.$inferSelect["status"];

export function setCourseStatus(db: Database, actorId: string, courseId: string, status: CourseStatus) {
  return audited(db, actorId, { action: `course.${status}`, resourceType: "course", resourceId: courseId, reason: "Durum değiştirildi" }, async (tx) => {
    const changed = await tx.update(courses).set({ status }).where(eq(courses.id, courseId)).returning({ id: courses.id });
    return changed.length > 0;
  });
}

/** Access duration is the one course setting that lives on the site rather than in Shopier. Existing grants keep their snapshot. */
export async function setAccessDuration(db: Database, actorId: string, courseId: string, days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Access duration must be 1–3650 whole days.");
  return audited(db, actorId, { action: "course.access_duration", resourceType: "course", resourceId: courseId, reason: `${days} gün` }, async (tx) => {
    const changed = await tx.update(courses).set({ accessDurationDays: days }).where(eq(courses.id, courseId)).returning({ id: courses.id });
    return changed.length > 0;
  });
}

/** Runs the catalog sync, then records who asked for it. */
export function syncCatalogAsOwner(db: Database, actorId: string, sync: () => Promise<{ added: number; archived: number }>) {
  return sync().then(async (result) => {
    await audited(db, actorId, { action: "catalog.sync", resourceType: "catalog", resourceId: "shopier", reason: `Shopier ile eşitlendi (+${result.added}, arşiv ${result.archived})` }, async () => true);
    return result;
  });
}
