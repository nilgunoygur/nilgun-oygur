"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Closing sets a cookie the account page reads, so the notice stays closed on the next visit. */
export function Dismissible({ cookie, days, className, closeClassName, children }: { cookie: string; days: number; className?: string; closeClassName?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => { document.cookie = `${cookie}=closed; path=/akademi; max-age=${days * 86_400}; samesite=lax`; setOpen(false); };
  return <div className={className}>
    {children}
    <Button type="button" variant="ghost" size="icon" className={cn("shrink-0", closeClassName)} aria-label="Bu bildirimi kapat" onClick={close}><X /></Button>
  </div>;
}
