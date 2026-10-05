type Step = { id: string; title: string; kind: "video" | "audio" | "live" };

/** Live meetings neither require nor block completion of recorded lessons. */
export function lessonPrerequisites(lessons: Step[], completed: ReadonlySet<string>) {
  let firstUnfinished: Step | undefined;
  return new Map(lessons.map(lesson => {
    const prerequisite = lesson.kind === "live" ? null : firstUnfinished ?? null;
    if (lesson.kind !== "live" && !completed.has(lesson.id) && !firstUnfinished) firstUnfinished = lesson;
    return [lesson.id, prerequisite] as const;
  }));
}
