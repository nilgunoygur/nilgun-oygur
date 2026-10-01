import { courseSlug } from "./slug.ts";

// What a homework PDF may be; shared by the upload form and the server.
export const lessonFileRules = {
  accept: ".pdf,application/pdf",
  types: ["application/pdf"],
  maxBytes: 25 * 1024 * 1024,
  hint: "Yalnızca PDF; dosya başına en fazla 25 MB.",
};

/** Homework PDFs per lesson. */
export const maxLessonDocuments = 20;

/** The browser's type, or the extension's when the browser reports none. */
export const lessonFileType = (file: { name: string; type: string }) => file.type.toLowerCase() || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");

/** null when the file is acceptable, otherwise the message to show. `type` comes from lessonFileType. */
export function lessonFileProblem(file: { type: string; size: number }): string | null {
  if (!lessonFileRules.types.includes(file.type)) return "Ödev dosyası PDF olmalıdır.";
  if (file.size <= 0 || file.size > lessonFileRules.maxBytes) return `Dosya çok büyük. ${lessonFileRules.hint}`;
  return null;
}

const prefix = (lessonId: string) => `lessons/${lessonId}/`;
/** "Ödev 1 – Nefes.pdf" → "lessons/<lesson>/<key>/odev-1-nefes.pdf"; the last segment is the name the browser saves. */
export function lessonFilePath(lessonId: string, key: string, name: string): string {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? courseSlug(name.slice(dot + 1), 5) : "";
  const base = courseSlug(dot > 0 ? name.slice(0, dot) : name, 60) || "dosya";
  return `${prefix(lessonId)}${key}/${base}${extension ? `.${extension}` : ""}`;
}
export const isLessonFilePath = (lessonId: string, pathname: string) => pathname.startsWith(prefix(lessonId)) && /^[a-z0-9/.-]+$/.test(pathname) && !pathname.includes("..");

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
