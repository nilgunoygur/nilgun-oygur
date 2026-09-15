"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { nav as links } from "@/lib/content";
export function Header() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <motion.header
      className="site-header"
      initial={{ opacity: 0, transform: "translateX(-50%) translateY(-100px)" }}
      animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay: reduced ? 0 : 0.7,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <Link href="/" className="brand" aria-label="Nilgün Oygur — Anasayfa">
        <Image
          src="/images/TsTjnwVPkEfzrtoq3abevoFKEpU.png"
          alt=""
          width={42}
          height={42}
        />
        <span>Nilgün Oygur</span>
      </Link>
      <nav aria-label="Ana menü" className="desktop-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mobile-nav">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Menüyü aç" />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nilgün Oygur</SheetTitle>
              <SheetDescription>
                Kişisel yolculuğunuza başlayın
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-6 p-6" aria-label="Mobil menü">
              {[
                { label: "Anasayfa", href: "/" },
                ...links,
                { label: "Hakkımda", href: "/nilgun-oygur" },
              ].map((link) => (
                <Link
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
