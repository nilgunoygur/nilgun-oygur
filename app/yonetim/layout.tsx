import { Suspense } from "react";
import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { cn } from "@/lib/utils";
import { OwnerNavigation } from "./owner-navigation";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function OwnerLayout({ children }: { children: React.ReactNode }) { return <QueryProvider><Suspense fallback={<nav aria-label="Yönetim bölümleri" className={cn("h-14 border-b border-forest/10 bg-white/90")} />}><OwnerNavigation /></Suspense>{children}</QueryProvider>; }
