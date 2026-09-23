import { Suspense } from "react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { formatPrice } from "@/lib/akademi/format";
import { OwnerCourseTable } from "@/components/akademi/owner-course-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accountPage, accountTitle, kicker, pageWidth } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eğitimler" };
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default function OwnerCourses() {
  return <section className={cn(pageWidth, accountPage)}><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Eğitimler yükleniyor…</div>}><CoursesAndSales /></Suspense></section>;
}

async function CoursesAndSales() {
  await ownerPage();
  const owner = akademi().owner;
  const [{ courses, recentSales }, attention] = await Promise.all([owner.catalog(), owner.needsAttention()]);
  return <>
    <header className="mb-9"><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Eğitimler ve satışlar</h1><p className="mt-3 max-w-2xl text-muted-foreground">Eğitimlerinizi, erişim sürelerini ve satışları tek yerden yönetin.</p></header>
    <OwnerCourseTable initialCourses={courses} />
    <Card className="mt-8 border-forest/10"><CardHeader><CardTitle>Son satışlar</CardTitle><CardDescription>Kaydedilen Shopier eğitim siparişleri</CardDescription></CardHeader><CardContent>{recentSales.length === 0 ? <p className="text-sm text-muted-foreground">Henüz satış yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Eğitim</TableHead><TableHead>Alıcı</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{recentSales.map(sale => <TableRow key={sale.id}><TableCell className="whitespace-nowrap"><span className="block font-medium">{date.format(sale.at)}</span><span className="text-xs text-muted-foreground">#{sale.order}</span></TableCell><TableCell>{sale.title}</TableCell><TableCell><span className="block">{sale.email}</span><Badge variant={sale.claimed ? "secondary" : "outline"}>{sale.claimed ? "Hesaba eklendi" : "Hesap bekliyor"}</Badge></TableCell><TableCell className="text-right font-medium">{formatPrice(sale.amount)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    {attention.length > 0 && <Card className="mt-8 border-destructive/30"><CardHeader><CardTitle>İlgilenilmesi gerekenler</CardTitle><CardDescription>İşlenemeyen Shopier bildirimleri</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Bildirim</TableHead><TableHead>Deneme</TableHead><TableHead>Hata</TableHead></TableRow></TableHeader><TableBody>{attention.map(item => <TableRow key={item.eventIdentity}><TableCell>{date.format(item.at)}</TableCell><TableCell>{item.eventIdentity}</TableCell><TableCell>{item.attempts}</TableCell><TableCell className="max-w-sm text-xs text-muted-foreground">{item.error}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}
  </>;
}
