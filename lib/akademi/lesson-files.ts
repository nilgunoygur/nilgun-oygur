import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { adminAuditLog, lessonFiles, lessons } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { lessonFileRules, maxLessonDocuments, waveformBars } from "./lesson-file-rules.ts";

// Owner commands for the files of a lesson. The boundary authorizes the owner and moves the bytes
// (Vercel Blob); these keep the database rows and the audit log, and say which stored files to delete.

export type LessonFile = typeof lessonFiles.$inferSelect;

const base = { lessonId: z.uuid(), name: z.string().trim().min(1).max(160), pathname: z.string().min(1).max(400), mime: z.string().min(1).max(100), sizeBytes: z.number().int().positive() };
const newFile = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("audio"), durationSeconds: z.number().int().min(1).max(86_400), peaks: z.array(z.number().int().min(0).max(100)).min(8).max(waveformBars).nullable() }),
  z.object({ ...base, kind: z.literal("document") }),
]);

export async function ownerLessonFiles(db: Database, lessonIds: string[]) {
  if (!lessonIds.length) return [];
  return db.select().from(lessonFiles).where(inArray(lessonFiles.lessonId, lessonIds)).orderBy(asc(lessonFiles.createdAt));
}

/** Records an uploaded file. A new recording replaces the lesson's previous one, whose pathname is returned for deletion. */
export async function addLessonFile(db: Database, actorId: string, raw: z.input<typeof newFile>) {
  const input = newFile.parse(raw);
  if (!lessonFileRules[input.kind].types.includes(input.mime) || input.sizeBytes > lessonFileRules[input.kind].maxBytes) throw new Error("Bu dosya türü veya boyutu kabul edilmiyor.");
  return db.transaction(async tx => {
    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, input.lessonId)).for("update");
    if (!lesson) throw new Error("Ders bulunamadı.");
    if (input.kind === "audio" && lesson.kind !== "audio") throw new Error("Ses kaydı yalnızca ses derslerine eklenebilir.");
    const existing = await tx.select().from(lessonFiles).where(and(eq(lessonFiles.lessonId, lesson.id), eq(lessonFiles.kind, input.kind)));
    if (input.kind === "document" && existing.length >= maxLessonDocuments) throw new Error(`Bir derse en fazla ${maxLessonDocuments} PDF eklenebilir.`);
    const replaced = input.kind === "audio" ? existing : [];
    if (replaced.length) await tx.delete(lessonFiles).where(inArray(lessonFiles.id, replaced.map(file => file.id)));
    const [file] = await tx.insert(lessonFiles).values(input).returning();
    await tx.insert(adminAuditLog).values({ actorId, action: `file.${input.kind}.add`, resourceType: "lesson", resourceId: lesson.id, reason: input.kind === "audio" ? `Ses kaydı ${replaced.length ? "değiştirildi" : "eklendi"}: ${input.name}` : `Ödev PDF’i eklendi: ${input.name}` });
    return { file, courseId: lesson.courseId, replaced: replaced.map(file => file.pathname) };
  });
}

/** A published audio lesson keeps its recording; replace it or unpublish first. */
export async function removeLessonFile(db: Database, actorId: string, fileId: string) {
  return db.transaction(async tx => {
    const [row] = await tx.select({ file: lessonFiles, lesson: lessons }).from(lessonFiles).innerJoin(lessons, eq(lessons.id, lessonFiles.lessonId)).where(eq(lessonFiles.id, fileId)).for("update");
    if (!row) throw new Error("Dosya bulunamadı.");
    if (row.file.kind === "audio" && row.lesson.status === "published") throw new Error("Yayındaki dersin ses kaydı silinemez. Yeni bir kayıt yükleyin veya dersi taslağa alın.");
    await tx.delete(lessonFiles).where(eq(lessonFiles.id, row.file.id));
    await tx.insert(adminAuditLog).values({ actorId, action: `file.${row.file.kind}.remove`, resourceType: "lesson", resourceId: row.lesson.id, reason: `Dosya silindi: ${row.file.name}` });
    return { pathname: row.file.pathname, courseId: row.lesson.courseId };
  });
}
