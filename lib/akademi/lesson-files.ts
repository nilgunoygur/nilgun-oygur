import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { adminAuditLog, lessonFiles, lessons } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { lessonFileRules, maxLessonDocuments } from "./lesson-file-rules.ts";

// Owner commands for a lesson's homework PDFs. The boundary authorizes the owner and moves the bytes
// (Vercel Blob); these keep the database rows and the audit log, and say which stored file to delete.

export type LessonFile = typeof lessonFiles.$inferSelect;

const newFile = z.object({ lessonId: z.uuid(), name: z.string().trim().min(1).max(160), pathname: z.string().min(1).max(400), mime: z.string().min(1).max(100), sizeBytes: z.number().int().positive() });

export async function ownerLessonFiles(db: Database, lessonIds: string[]) {
  if (!lessonIds.length) return [];
  return db.select().from(lessonFiles).where(inArray(lessonFiles.lessonId, lessonIds)).orderBy(asc(lessonFiles.createdAt));
}

/** Records an uploaded PDF on its lesson. */
export async function addLessonFile(db: Database, actorId: string, raw: z.input<typeof newFile>) {
  const input = newFile.parse(raw);
  if (!lessonFileRules.types.includes(input.mime) || input.sizeBytes > lessonFileRules.maxBytes) throw new Error("Bu dosya türü veya boyutu kabul edilmiyor.");
  return db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, input.lessonId)).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    const existing = await tx.select({ id: lessonFiles.id }).from(lessonFiles).where(eq(lessonFiles.lessonId, lesson.id));
    if (existing.length >= maxLessonDocuments) throw new Error(`Bir derse en fazla ${maxLessonDocuments} PDF eklenebilir.`);
    const [file] = await tx.insert(lessonFiles).values(input).returning();
    await tx.insert(adminAuditLog).values({ actorId, action: "file.add", resourceType: "lesson", resourceId: lesson.id, reason: `Ödev PDF’i eklendi: ${input.name}` });
    return { file, courseId: lesson.courseId };
  });
}

export async function removeLessonFile(db: Database, actorId: string, fileId: string) {
  return db.transaction(async tx => {
    const [row] = await tx.select({ file: lessonFiles, courseId: lessons.courseId }).from(lessonFiles).innerJoin(lessons, eq(lessons.id, lessonFiles.lessonId)).where(eq(lessonFiles.id, fileId)).for("update");
    if (!row) throw new Error("Dosya bulunamadı.");
    await tx.delete(lessonFiles).where(eq(lessonFiles.id, row.file.id));
    await tx.insert(adminAuditLog).values({ actorId, action: "file.remove", resourceType: "lesson", resourceId: row.file.lessonId, reason: `Ödev PDF’i silindi: ${row.file.name}` });
    return { pathname: row.file.pathname, courseId: row.courseId };
  });
}
