import Link from "next/link";
import type { Announcement } from "@/lib/announcements";
import { cn } from "@/lib/utils";

// Each half must be wider than the widest screen, or the loop shows a gap before restarting.
const REPEAT = 5;

export function AnnouncementBar({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  const run = Array.from({ length: REPEAT }, () => items).flat();
  const half = (hidden: boolean) => <ul className={cn("m-0 flex list-none items-center p-0 motion-reduce:w-screen motion-reduce:justify-center motion-reduce:overflow-x-auto", hidden && "motion-reduce:hidden")} aria-hidden={hidden || undefined}>
    {run.map((item, index) => {
      const copy = hidden || index >= items.length;
      return <li key={index} aria-hidden={copy && !hidden ? true : undefined} className={cn("flex items-center whitespace-nowrap after:mx-7 after:text-[10px] after:text-lime after:content-['✦']", copy && !hidden && "motion-reduce:hidden")}>
        {item.href ? <Link href={item.href} tabIndex={copy ? -1 : undefined} className="text-inherit no-underline hover:text-lime hover:underline hover:underline-offset-3 focus-visible:text-lime focus-visible:underline focus-visible:underline-offset-3">{item.text}</Link> : item.text}
      </li>;
    })}
  </ul>;
  return <aside className="group fixed inset-x-0 top-0 z-41 h-[38px] overflow-hidden bg-forest text-[13px] text-mist [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]" aria-label="Duyurular" style={{ "--announcement-duration": `${run.length * 7}s` } as React.CSSProperties}>
    <div className="flex h-full w-max animate-announcement will-change-transform group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">{half(false)}{half(true)}</div>
  </aside>;
}
