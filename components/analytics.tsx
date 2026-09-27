"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

type TrackProps = { event: string; params: Record<string, unknown> };

/** Sends one event once the page has opened, e.g. view_item. */
export function TrackOnView({ event, params }: TrackProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    // Marked on fire, so a cancelled effect (StrictMode, fast navigation) doesn't drop it.
    const timer = setTimeout(() => { sent.current = true; track(event, params); }, 300);
    return () => clearTimeout(timer);
  }, [event, params]);
  return null;
}

export function TrackedLink({ event, params, ...props }: React.ComponentProps<"a"> & TrackProps) {
  return <a {...props} onClick={() => track(event, params)} />;
}

/** article_read: the reader reached the end and spent at least 20 s on the page. */
export function ArticleReadTracker({ slug, title, category }: { slug: string; title: string; category: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const openedAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      timer = setTimeout(() => track("article_read", {
        article_slug: slug, article_title: title, article_category: category, read_seconds: Math.round((performance.now() - openedAt) / 1000),
      }), Math.max(0, 20_000 - (performance.now() - openedAt)));
    });
    if (end.current) observer.observe(end.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [slug, title, category]);
  return <div ref={end} aria-hidden="true" />;
}
