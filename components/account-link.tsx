"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, LogOut, Settings, ShoppingBag, LayoutDashboard } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { avatarSource } from "@/lib/auth/profile";
import { accountOptions } from "@/app/akademi/hesabim/profile-actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const guestOptions = { isOwner: false, localEmail: false };
const menuItemClass = "min-h-11 gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-foreground/85 transition-colors focus:bg-mist focus:text-forest [&_svg]:text-forest/65";

export function AccountLink({ compact = false }: { compact?: boolean }) {
  const { data } = authClient.useSession();
  const router = useRouter();
  const [options, setOptions] = useState(guestOptions);
  const [error, setError] = useState("");
  if (!data?.user.emailVerified) return null;
  const user = data.user;
  const firstName = user.name.trim().split(/\s+/)[0] || "Hesabım";
  return <>
    <DropdownMenu onOpenChange={(open) => { if (open) void accountOptions().then(setOptions).catch(() => setOptions(guestOptions)); }}>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-auto min-h-11 gap-2 rounded-full px-1.5 py-1.5 hover:bg-mist hover:text-forest aria-expanded:bg-mist aria-expanded:text-forest" />} aria-label={`Hesap menüsü — ${user.name}`}>
        <Avatar><AvatarImage src={avatarSource(user.image)} alt="" /><AvatarFallback>{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar>
        {!compact && <><span>{firstName}</span><ChevronDown className="size-3" /></>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[min(288px,calc(100vw-32px))] rounded-[22px] border border-forest/10 bg-white p-2.5 shadow-[0_18px_50px_-20px_rgba(34,76,64,0.28),0_6px_18px_-8px_rgba(34,76,64,0.12)] ring-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="mb-2 flex items-center gap-3 rounded-2xl bg-mist px-3 py-3.5">
            <Avatar size="lg"><AvatarImage src={avatarSource(user.image)} alt="" /><AvatarFallback>{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold leading-tight text-forest">{user.name}</span>
              <span className="mt-1 block text-[11px] font-medium leading-tight text-stone">Akademi hesabım</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/hesabim" />}><BookOpen />Eğitimlerim</DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/profil" />}><Settings />Profil ayarları</DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/siparis-ekle" />}><ShoppingBag />Shopier siparişi ekle</DropdownMenuItem>
          {options.isOwner && <DropdownMenuItem className={menuItemClass} render={<Link href="/yonetim" />}><LayoutDashboard />Yönetim</DropdownMenuItem>}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2 bg-forest/10" />
        <DropdownMenuGroup><DropdownMenuItem className={`${menuItemClass} text-destructive focus:text-destructive [&_svg]:text-destructive`} variant="destructive" onClick={async () => {
          try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.replace("/akademi/giris"); router.refresh(); }
          catch { setError("Çıkış yapılamadı. Lütfen tekrar deneyin."); }
        }}><LogOut />Çıkış yap</DropdownMenuItem></DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
  </>;
}
