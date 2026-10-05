import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { filesConfigured } from "@/lib/files/storage";
import { OwnerCourseManagement } from "@/components/akademi/owner-course-management";
import { pageWidth, backLink, ownerSection, accountTitle, kicker } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eğitim yönetimi" };

export default function OwnerCourses() {
  return <section className={cn(pageWidth, ownerSection)}><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Eğitimler yükleniyor…</div>}><Courses /></Suspense></section>;
}

async function Courses() {
  await ownerPage();
  const initialData = await akademi().owner.catalogSnapshot();

  return <>
    <Link href="/yonetim" className={backLink}><ArrowLeft className="size-4" /> Genel bakış</Link>
    <header className="mb-8"><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>Eğitim yönetimi</h1><p className="mt-3 max-w-2xl text-muted-foreground">Eğitim programlarını, satışları ve bekleyen bildirimleri tek yerden takip edin.</p></header>
    <OwnerCourseManagement initialData={initialData} filesConfigured={filesConfigured()} />
  </>;
}
