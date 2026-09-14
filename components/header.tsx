"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
const links = [
  { label: "Kitaplarım", href: "/kitaplarim" },
  { label: "Eğitimlerim", href: "/egitimlerim" },
  { label: "Yazılarım", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
];
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
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
    </header>
  );
}
