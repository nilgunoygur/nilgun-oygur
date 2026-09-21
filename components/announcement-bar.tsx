import Link from "next/link";
import type { Announcement } from "@/lib/announcements";

export function AnnouncementBar({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  const list = (hidden: boolean) => <ul className="announcement-bar-list" aria-hidden={hidden || undefined}>
    {items.map(item => <li key={item.text}>{item.href ? <Link href={item.href} tabIndex={hidden ? -1 : undefined}>{item.text}</Link> : item.text}</li>)}
  </ul>;
  return <aside className="announcement-bar" aria-label="Duyurular">
    <div className="announcement-bar-track">{list(false)}{list(true)}</div>
  </aside>;
}
