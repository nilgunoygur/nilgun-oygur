import { courseSlug } from "./slug.ts";

// What an audio lesson's recording and a homework PDF may be; shared by the upload form and the server.
export type LessonFileKind = "audio" | "document";

export const lessonFileRules = {
  audio: {
    accept: ".mp3,.m4a,.aac,.wav,audio/mpeg,audio/mp4,audio/aac,audio/wav",
    types: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav"],
    maxBytes: 250 * 1024 * 1024,
    hint: "MP3, M4A veya WAV; en fazla 250 MB.",
  },
  document: {
    accept: ".pdf,application/pdf",
    types: ["application/pdf"],
    maxBytes: 25 * 1024 * 1024,
    hint: "Yalnızca PDF; dosya başına en fazla 25 MB.",
  },
} satisfies Record<LessonFileKind, { accept: string; types: string[]; maxBytes: number; hint: string }>;

/** Homework PDFs per lesson. */
export const maxLessonDocuments = 20;
/** Waveform bars stored per recording. */
export const waveformBars = 240;

const typeByExtension: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", pdf: "application/pdf" };
/** The browser's type, or the extension's when the browser reports none (some do for .m4a). */
export const lessonFileType = (file: { name: string; type: string }) => file.type.toLowerCase() || typeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";

/** null when the file is acceptable, otherwise the message to show. `type` comes from lessonFileType. */
export function lessonFileProblem(kind: LessonFileKind, file: { type: string; size: number }): string | null {
  const rules = lessonFileRules[kind];
  if (!rules.types.includes(file.type)) return kind === "audio" ? "Ses dosyası MP3, M4A veya WAV olmalıdır." : "Ödev dosyası PDF olmalıdır.";
  if (file.size <= 0 || file.size > rules.maxBytes) return `Dosya çok büyük. ${rules.hint}`;
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
