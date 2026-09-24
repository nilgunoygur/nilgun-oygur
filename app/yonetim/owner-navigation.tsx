"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, LayoutDashboard, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/yonetim", label: "Genel bakış", icon: LayoutDashboard, exact: true },
  { href: "/yonetim/egitimler", label: "Eğitimler ve satışlar", icon: BookOpen },
  { href: "/yonetim/yazilar", label: "Yazılar", icon: FileText },
  { href: "/yonetim/banner", label: "Banner", icon: Megaphone },
];

export function OwnerNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Yönetim bölümleri" className="border-b border-forest/10 bg-white/90 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors", active ? "bg-mist text-forest" : "text-stone hover:bg-mist/70 hover:text-forest")}>
          <Icon className="size-4" />{label}
        </Link>;
      })}
    </div>
  </nav>;
}
