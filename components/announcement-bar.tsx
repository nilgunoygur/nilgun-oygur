"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { BannerConfig, Announcement } from "@/lib/announcements";
import { cn } from "@/lib/utils";

function AnnouncementText({ item, tabIndex }: { item: Announcement; tabIndex?: number }) {
  return item.href
    ? <Link href={item.href} tabIndex={tabIndex} className="text-inherit no-underline hover:underline hover:underline-offset-3 focus-visible:underline focus-visible:underline-offset-3">{item.text}</Link>
    : <span>{item.text}</span>;
}

export function AnnouncementBar({ config, preview = false }: { config: BannerConfig; preview?: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (config.animation !== "fade" || reducedMotion || paused || config.items.length < 2) return;
    const timer = window.setInterval(() => setActive(index => {
      if (index === config.items.length - 1 && !config.loop) return index;
      return (index + 1) % config.items.length;
    }), config.speedSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [config.animation, config.speedSeconds, config.loop, config.items.length, reducedMotion, paused]);

  if (config.items.length === 0) return null;
  const moving = config.animation === "scroll" && !reducedMotion;
  // Each half must be wider than the widest screen, or the loop shows a gap.
  const run = Array.from({ length: Math.max(5, Math.ceil(24 / config.items.length)) }, () => config.items).flat();
  const half = (hidden: boolean) => <ul className="m-0 flex shrink-0 list-none items-center p-0" aria-hidden={hidden || undefined}>
    {run.map((item, index) => {
      const copy = hidden || index >= config.items.length;
      return <li key={index} aria-hidden={copy || undefined} className="flex shrink-0 items-center whitespace-nowrap">
        <span className={cn("px-1", copy && "pointer-events-none")}><AnnouncementText item={item} tabIndex={copy || preview ? -1 : undefined} /></span>
        <span aria-hidden="true" className="mx-6 text-[10px]" style={{ color: config.accentColor }}>{config.separator}</span>
      </li>;
    })}
  </ul>;

  return <aside
    aria-label="Duyurular"
    aria-hidden={preview || undefined}
    className={cn("group h-[38px] overflow-hidden text-[13px]", preview ? "relative w-full rounded-xl" : "fixed inset-x-0 top-0 z-41", moving && "[mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]")}
    style={{ backgroundColor: config.backgroundColor, color: config.textColor }}
    onMouseEnter={() => config.pauseOnHover && setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => config.pauseOnHover && setPaused(true)}
    onBlurCapture={() => setPaused(false)}
  >
    {moving ? <div className="flex h-full w-max animate-announcement items-center will-change-transform" style={{
      "--announcement-duration": `${run.length * config.speedSeconds}s`,
      animationDirection: config.direction === "right" ? "reverse" : "normal",
      animationIterationCount: config.loop ? "infinite" : "1",
      animationFillMode: "forwards",
      animationPlayState: paused ? "paused" : "running",
    } as React.CSSProperties}>{half(false)}{half(true)}</div>
      : <div className="relative flex h-full items-center justify-center overflow-hidden px-5 text-center">
        {config.animation === "fade" && !reducedMotion ? <AnimatePresence initial={false} mode="wait">
          <m.div key={active % config.items.length} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: Math.min(0.5, config.speedSeconds / 5) }} className="absolute inset-0 flex items-center justify-center px-5">
            <AnnouncementText item={config.items[active % config.items.length]} tabIndex={preview ? -1 : undefined} />
          </m.div>
        </AnimatePresence> : <AnnouncementText item={config.items[0]} tabIndex={preview ? -1 : undefined} />}
      </div>}
  </aside>;
}
