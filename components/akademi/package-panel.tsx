"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, Package, Pencil } from "lucide-react";
import { toast } from "sonner";
import { courseStatusLabel, updateOwnerCourse, type OwnerCourse } from "@/lib/akademi/owner-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BundleForm } from "./bundle-form";

/** Opens the course picker: changes a package's contents, or turns an ordinary course into a package. */
export function PackageContentsButton({ course, courses, children }: { course: OwnerCourse; courses: OwnerCourse[]; children: React.ReactNode }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: (courseIds: string[]) => updateOwnerCourse(course.id, { kind: "bundle", courseIds }),
    onSuccess: () => { setEditing(false); toast.success("Paket içeriği kaydedildi."); router.refresh(); },
  });
  return <>
    <Button type="button" variant="outline" size="pill" onClick={() => setEditing(true)}>{children}</Button>
    <Dialog open={editing} onOpenChange={setEditing}><DialogContent><DialogHeader><DialogTitle>Paket içeriği</DialogTitle><DialogDescription>“{course.title}” satın alındığında öğrenciye seçtiğiniz eğitimlerin hepsi açılır.</DialogDescription></DialogHeader>
      {editing && <BundleForm course={course} courses={courses} saving={save.isPending} onSave={save.mutate} />}
    </DialogContent></Dialog>
  </>;
}

/** What a package grants, on its own management page. */
export function PackagePanel({ course, courses }: { course: OwnerCourse; courses: OwnerCourse[] }) {
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
