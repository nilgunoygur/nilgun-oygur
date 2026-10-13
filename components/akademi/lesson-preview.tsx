"use client";

import type { ComponentProps } from "react";
import { previewPlayback } from "@/app/yonetim/egitimler/[slug]/actions";
import { LessonChecklist, type LessonCalls } from "./lesson-checklist";

const calls: LessonCalls = {
  getPlayback: previewPlayback,
  joinLive: async () => ({ error: "Önizlemede Zoom bağlantısı açılmaz. Öğrenciler burada katılım bağlantılarını görür." }),
  updateProgress: async () => ({ ok: true }),
};

/** The student's lesson list for the owner: owner tokens, nothing saved, no meeting joined. */
export function LessonPreview(props: Omit<ComponentProps<typeof LessonChecklist>, "preview">) {
  return <LessonChecklist {...props} preview={calls} />;
}
