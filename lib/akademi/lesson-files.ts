import { asc, eq, inArray } from "drizzle-orm";
import { adminAuditLog, lessonFiles, lessons } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { lessonFileProblem, maxLessonDocuments } from "./lesson-file-rules.ts";

// Homework PDFs. The boundary authorizes the owner and moves the bytes; these keep the rows and the audit log.

/** Looks up a lesson's PDFs, oldest first; storage paths stay on the server. */
export async function lessonDocuments(db: Database, lessonIds: string[]) {
  const files = lessonIds.length ? await db.select({ id: lessonFiles.id, lessonId: lessonFiles.lessonId, name: lessonFiles.name, sizeBytes: lessonFiles.sizeBytes })
    .from(lessonFiles).where(inArray(lessonFiles.lessonId, lessonIds)).orderBy(asc(lessonFiles.createdAt)) : [];
  return (lessonId: string) => files.filter(file => file.lessonId === lessonId).map(({ id, name, sizeBytes }) => ({ id, name, sizeBytes }));
}

export async function addLessonFile(db: Database, actorId: string, input: { lessonId: string; name: string; pathname: string; mime: string; sizeBytes: number }) {
  const problem = lessonFileProblem({ type: input.mime, size: input.sizeBytes });
  if (problem) throw new Error(problem);
  const name = input.name.trim().slice(0, 160);
  return db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, input.lessonId)).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    const existing = await tx.select({ id: lessonFiles.id }).from(lessonFiles).where(eq(lessonFiles.lessonId, lesson.id));
    if (existing.length >= maxLessonDocuments) throw new Error(`Bir derse en fazla ${maxLessonDocuments} PDF eklenebilir.`);
    const [file] = await tx.insert(lessonFiles).values({ ...input, name }).returning();
    await tx.insert(adminAuditLog).values({ actorId, action: "file.add", resourceType: "lesson", resourceId: lesson.id, reason: `Ödev PDF’i eklendi: ${name}` });
    return { file };
  });
}

export async function removeLessonFile(db: Database, actorId: string, fileId: string) {
  return db.transaction(async tx => {
    const [file] = await tx.select().from(lessonFiles).where(eq(lessonFiles.id, fileId)).for("update");
    if (!file) throw new Error("Dosya bulunamadı.");
    await tx.delete(lessonFiles).where(eq(lessonFiles.id, file.id));
    await tx.insert(adminAuditLog).values({ actorId, action: "file.remove", resourceType: "lesson", resourceId: file.lessonId, reason: `Ödev PDF’i silindi: ${file.name}` });
    return { pathname: file.pathname };
  });
}
