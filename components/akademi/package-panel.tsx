"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Package, Pencil } from "lucide-react";
import { courseStatusLabel } from "@/lib/akademi/owner-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PackageContentsDialog, type BundleCourse } from "./bundle-form";

type Props = { course: BundleCourse; courses: BundleCourse[] };

export function PackageContentsButton({ course, courses, children }: Props & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="pill" onClick={() => setOpen(true)}>{children}</Button>
    <PackageContentsDialog course={open ? course : null} courses={courses} onClose={() => setOpen(false)} />
  </>;
}

export function PackagePanel({ course, courses }: Props) {
  const included = courses.filter(item => course.includes.includes(item.id));
  return <Card className="border-forest/10 shadow-sm"><CardContent className="p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><h2 className="flex items-center gap-2 text-xl font-semibold text-forest"><Package className="size-5" />Paket içeriği</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone">Bu paketi satın alan öğrenciye aşağıdaki {included.length} eğitimin hepsi {course.accessDurationDays} gün için açılır.</p></div>
      <PackageContentsButton course={course} courses={courses}><Pencil />İçeriği değiştir</PackageContentsButton>
    </div>
    <ul className="mt-5 grid gap-3 border-t border-border pt-5">{included.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
      <span className="min-w-0 flex-1 font-medium">{item.title}</span>
      {item.status !== "published" && <Badge variant="outline">{courseStatusLabel[item.status]}</Badge>}
      <Link href={`/yonetim/egitimler/${item.slug}`} className="inline-flex items-center gap-1 text-sm text-forest underline underline-offset-4">Dersleri<ArrowUpRight size={15} /></Link>
      <Link href={`/yonetim/egitimler/${item.slug}/onizleme`} className="inline-flex items-center gap-1 text-sm text-forest underline underline-offset-4">Önizle<ArrowUpRight size={15} /></Link>
    </li>)}</ul>
  </CardContent></Card>;
}
