import { Suspense } from "react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { OwnerCourseTable } from "@/components/akademi/owner-course-table";
import { pageWidth, accountPage, accountTitle, kicker } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eğitim yönetimi" };

export default function OwnerCourses() {
  return <section className={cn(pageWidth, accountPage)}><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Eğitimler yükleniyor…</div>}><Courses /></Suspense></section>;
}

async function Courses() {
  await ownerPage();
  const owner = akademi().owner;
  const [catalog, attention] = await Promise.all([owner.catalog(), owner.needsAttention()]);
  const initialData = {
    ...catalog,
    recentSales: catalog.recentSales.map(sale => ({ ...sale, claimed: Boolean(sale.claimed), at: sale.at.toISOString() })),
    attention: attention.map(item => ({ ...item, at: item.at.toISOString() })),
  };

  return <>
    <header className="mb-8"><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Eğitim yönetimi</h1><p className="mt-3 max-w-2xl text-muted-foreground">Eğitim programlarını, satışları ve bekleyen bildirimleri tek yerden takip edin.</p></header>
    <OwnerCourseTable initialData={initialData} />
  </>;
}
