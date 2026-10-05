import { Suspense } from "react";
import type { Metadata } from "next";
import { OwnerNavigation } from "./owner-navigation";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
// Clears the fixed site header.
export default function OwnerLayout({ children }: { children: React.ReactNode }) { return <><div className="pt-[100px] max-tablet:pt-[88px]"><Suspense fallback={<div className="h-[57px] border-y border-forest/10" />}><OwnerNavigation /></Suspense></div>{children}</>; }
