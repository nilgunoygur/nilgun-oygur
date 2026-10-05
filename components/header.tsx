"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { Suspense, useState } from "react";
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
import { AccountLink } from "@/components/account-link";
import { AcademyNavLink } from "@/components/academy-nav-link";
import { brand, brandLogo } from "@/lib/styles";
function NavLinks({ pathname }: { pathname: string }) {
  return links.map((link) => link.href === "/akademi"
    ? <AcademyNavLink key={link.href} label={link.label} href={link.href} current={pathname.startsWith(link.href)} />
    : (
      <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined} className="transition-colors duration-200 hover:text-foreground aria-[current]:text-foreground">
        {link.label}
      </Link>
    ));
}

// The current-page highlight is the only part that needs the URL; it streams in so every route keeps a static shell.
function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function Header() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <m.header
      className="fixed top-[calc(16px+var(--announcement-offset,0px))] left-1/2 z-40 flex h-[70px] w-[min(860px,calc(100%-40px))] [transform:translateX(-50%)] items-center justify-between rounded-[32px] bg-white/96 px-[26px] shadow-[0_5px_12px_#00000007,0_1px_2px_#00000004] backdrop-blur-[16px] max-tablet:top-[calc(12px+var(--announcement-offset,0px))] max-tablet:h-16 max-tablet:px-[18px] motion-reduce:opacity-100! motion-reduce:[transform:translateX(-50%)]!"
      initial={{ opacity: 0, transform: "translateX(-50%) translateY(-100px)" }}
      animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay: reduced ? 0 : 0.7,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <Link href="/" className={brand} aria-label="Nilgün Oygur — Anasayfa">
        <Image
          src="/images/TsTjnwVPkEfzrtoq3abevoFKEpU.png"
          alt=""
          width={42}
          height={42}
          className={brandLogo}
        />
        <span>Nilgün Oygur</span>
      </Link>
      <nav aria-label="Ana menü" className="flex items-center gap-[22px] text-[14px] font-medium text-muted-foreground max-tablet:hidden">
        <Suspense fallback={<NavLinks pathname="" />}>
          <CurrentNavLinks />
        </Suspense>
        <AccountLink />
      </nav>
      <div className="hidden items-center gap-2 max-tablet:flex">
        <AccountLink compact />
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
                ...links.filter(link => link.href !== "/akademi"),
                { label: "Hakkımda", href: "/nilgun-oygur" },
                ...links.filter(link => link.href === "/akademi"),
              ].map((link) => link.href === "/akademi"
                ? <AcademyNavLink key={link.href} label={link.label} href={link.href} onNavigate={() => setOpen(false)} />
                : (
                  <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </m.header>
  );
}
