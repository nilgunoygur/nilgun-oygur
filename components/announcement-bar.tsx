import Link from "next/link";
import type { Announcement } from "@/lib/announcements";

// Each half must be wider than the widest screen, or the loop shows a gap before restarting.
const REPEAT = 5;

export function AnnouncementBar({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  const run = Array.from({ length: REPEAT }, () => items).flat();
  const half = (hidden: boolean) => <ul className="announcement-bar-list" aria-hidden={hidden || undefined}>
    {run.map((item, index) => {
      const copy = hidden || index >= items.length;
      return <li key={index} aria-hidden={copy && !hidden ? true : undefined}>
        {item.href ? <Link href={item.href} tabIndex={copy ? -1 : undefined}>{item.text}</Link> : item.text}
      </li>;
    })}
  </ul>;
  return <aside className="announcement-bar" aria-label="Duyurular" style={{ "--announcement-duration": `${run.length * 7}s` } as React.CSSProperties}>
    <div className="announcement-bar-track">{half(false)}{half(true)}</div>
  </aside>;
}
