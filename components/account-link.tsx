"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, LogOut, Settings, ShoppingBag, LayoutDashboard } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { avatarSource } from "@/lib/auth/profile";
import { accountOptions } from "@/app/akademi/hesabim/profile-actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClaimOrderForm } from "@/components/akademi/claim-order-form";
import { ProfileSettings } from "@/components/akademi/profile-settings";

export function AccountLink({ compact = false }: { compact?: boolean }) {
  const { data, refetch } = authClient.useSession();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<"profile" | "claim" | null>(null);
  const [options, setOptions] = useState({ isOwner: false, localEmail: false });
  const [error, setError] = useState("");
  if (!data?.user.emailVerified) return null;
  const user = data.user;
  const firstName = user.name.trim().split(/\s+/)[0] || "Hesabım";
  return <>
    <DropdownMenu onOpenChange={(open) => { if (open) void accountOptions().then(setOptions).catch(() => setOptions({ isOwner: false, localEmail: false })); }}>
      <DropdownMenuTrigger ref={trigger} render={<Button variant="ghost" className="gap-2 rounded-full px-2" />} aria-label={`Hesap menüsü — ${user.name}`}>
        <Avatar><AvatarImage src={avatarSource(user.image)} alt="" /><AvatarFallback>{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</AvatarFallback></Avatar>
        {!compact && <><span>{firstName}</span><ChevronDown className="size-3" /></>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/akademi/hesabim" />}><BookOpen />Eğitimlerim</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("profile")}><Settings />Profil ayarları</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("claim")}><ShoppingBag />Shopier siparişi ekle</DropdownMenuItem>
          {options.isOwner && <DropdownMenuItem render={<Link href="/yonetim" />}><LayoutDashboard />Yönetim</DropdownMenuItem>}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup><DropdownMenuItem variant="destructive" onClick={async () => {
          try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.replace("/akademi/giris"); router.refresh(); }
          catch { setError("Çıkış yapılamadı. Lütfen tekrar deneyin."); }
        }}><LogOut />Çıkış yap</DropdownMenuItem></DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
    <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
      <DialogContent finalFocus={trigger} className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{dialog === "claim" ? "Shopier siparişinizi ekleyin" : "Profil ayarları"}</DialogTitle><DialogDescription>{dialog === "claim" ? "Satın aldığınız eğitimi sipariş numaranızla hesabınıza ekleyin." : "Kişisel bilgilerinizi ve şifrenizi buradan güncelleyin."}</DialogDescription></DialogHeader>
        {dialog === "claim" && <ClaimOrderForm />}
        {dialog === "profile" && <ProfileSettings user={user} localEmail={options.localEmail} onSaved={() => { void refetch(); }} />}
      </DialogContent>
    </Dialog>
  </>;
}
