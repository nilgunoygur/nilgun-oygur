"use client";
import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { claimHintCookie } from "@/lib/akademi/claim-schema";
import { Button, buttonVariants } from "@/components/ui/button";

/** Closing it sets a year-long cookie, which the account page reads to leave it out. */
export function ClaimHint() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => { document.cookie = `${claimHintCookie}=closed; path=/akademi; max-age=31536000; samesite=lax`; setOpen(false); };
  return <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[20px] bg-mist p-6">
    <p className="mr-auto">Satın aldığınız eğitim görünmüyor mu?</p>
    <Link href="/akademi/siparis-ekle" className={buttonVariants({ variant: "outline" })}>Shopier siparişimi ekle</Link>
    <Link href="/akademi/egitim-ekleme" className="text-sm text-forest underline underline-offset-4">Nasıl eklenir?</Link>
    <Button type="button" variant="ghost" size="icon" aria-label="Bu bildirimi kapat" onClick={close}><X /></Button>
  </div>;
}
