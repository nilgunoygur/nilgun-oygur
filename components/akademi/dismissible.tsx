"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Site-wide path: the account menu reads these from any page. */
export const closeNotice = (cookie: string, days: number) => { document.cookie = `${cookie}=closed; path=/; max-age=${days * 86_400}; samesite=lax`; };

/** Closing sets a cookie the server reads. */
export function Dismissible({ cookie, days, className, children }: { cookie: string; days: number; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <div className={className}>
    {children}
    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Bu bildirimi kapat" onClick={() => { closeNotice(cookie, days); setOpen(false); }}><X /></Button>
  </div>;
}
