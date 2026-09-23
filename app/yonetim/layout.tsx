import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function OwnerLayout({ children }: { children: React.ReactNode }) { return <QueryProvider>{children}</QueryProvider>; }
