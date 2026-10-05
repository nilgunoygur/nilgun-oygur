"use client";
import Link from "next/link";
import { useState } from "react";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, LifeBuoy, LogOut, Settings, ShoppingBag, LayoutDashboard, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { avatarSource } from "@/lib/auth/profile";
import { accountOptions } from "@/app/akademi/hesabim/profile-actions";
import { accountQueryKey } from "@/lib/akademi/account-query";
import { refundNoticeCookie, refundNoticeDays } from "@/lib/akademi/claim-schema";
import { closeNotice } from "@/components/akademi/dismissible";
import { refundNoticeCopy } from "@/components/akademi/refund-notice";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type Account = Awaited<ReturnType<typeof accountOptions>>;
const menuItemClass = "min-h-11 gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-foreground/85 transition-colors focus:bg-mist focus:text-forest [&_svg]:text-forest/65";

export function AccountLink({ compact = false }: { compact?: boolean }) {
  const { data } = authClient.useSession();
  const router = useRouter();
  const userId = data?.user.emailVerified ? data.user.id : null;
  const client = useQueryClient();
  const queryKey = accountQueryKey(userId);
  // Shared by the desktop and compact menus.
  const { data: account, isPending } = useQuery({ queryKey, queryFn: userId ? accountOptions : skipToken, staleTime: 300_000 });
  // Opening waits for the options, so the owner link never pops in late.
  const [wanted, setWanted] = useState(false);
  const menuOpen = wanted && !isPending, waiting = wanted && isPending;
  const [error, setError] = useState("");
  if (!data?.user.emailVerified) return null;
  const user = data.user;
  const firstName = user.name.trim().split(/\s+/)[0] || "Hesabım";
  const notices = account?.notices ?? [];
  const dismiss = (id: string) => {
    closeNotice(refundNoticeCookie(id), refundNoticeDays);
    client.setQueryData<Account>(queryKey, current => current && { ...current, notices: current.notices.filter(notice => notice.id !== id) });
  };
  return <>
    <DropdownMenu open={menuOpen} onOpenChange={setWanted}>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-auto min-h-11 gap-2 rounded-full px-1.5 py-1.5 hover:bg-mist hover:text-forest aria-expanded:bg-mist aria-expanded:text-forest" />} aria-label={`Hesap menüsü — ${user.name}${notices.length ? `, ${notices.length} bildirim` : ""}`}>
        <span className="relative"><Avatar><AvatarImage src={avatarSource(user.image)} alt="" /><AvatarFallback>{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar>{notices.length > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-[#c2553f] ring-2 ring-white" />}</span>
        {!compact && <><span>{firstName}</span>{waiting ? <Spinner /> : <ChevronDown className="size-3" />}</>}
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
        </DropdownMenuGroup>
        {notices.length > 0 && <DropdownMenuGroup className="mb-2 grid gap-2">
          <DropdownMenuLabel className="px-3 pt-1 pb-0 text-[10px] font-semibold tracking-[1.6px] text-stone">BİLDİRİMLER</DropdownMenuLabel>
          {notices.map(notice => <div key={notice.id} className="relative rounded-2xl border border-forest/10 p-3 pr-9 text-stone [&_p]:text-[12px] [&_p]:leading-[1.45]">
            <div id={`notice-${notice.id}`}>
              <p className="!text-[13px] font-semibold text-forest">{refundNoticeCopy[notice.status].title}</p>
              <p className="mt-1 font-medium text-foreground/85">{notice.course} · Sipariş #{notice.orderId}</p>
              <p className="mt-1">{refundNoticeCopy[notice.status].message}</p>
              {notice.note && <p className="mt-1 whitespace-pre-wrap break-words">Yanıt: {notice.note}</p>}
            </div>
            {notice.dismissible && <DropdownMenuItem closeOnClick={false} aria-label="Bildirimi kapat" aria-describedby={`notice-${notice.id}`} className="absolute top-1 right-1 size-7 justify-center rounded-lg p-0 focus:bg-mist [&_svg]:size-4" onClick={() => dismiss(notice.id)}><X /></DropdownMenuItem>}
          </div>)}
        </DropdownMenuGroup>}
        <DropdownMenuGroup>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/hesabim" />}><BookOpen />Eğitimlerim</DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/profil" />}><Settings />Profil ayarları</DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/siparis-ekle" />}><ShoppingBag />Shopier siparişi ekle</DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} render={<Link href="/akademi/egitim-ekleme#destek" />}><LifeBuoy />Destek</DropdownMenuItem>
          {account?.isOwner && <DropdownMenuItem className={menuItemClass} render={<Link href="/yonetim" />}><LayoutDashboard />Yönetim</DropdownMenuItem>}
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
