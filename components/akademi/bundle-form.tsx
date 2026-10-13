"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { courseStatusLabel, ownerQueryKeys, updateOwnerCourse, type OwnerCourse } from "@/lib/akademi/owner-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export type BundleCourse = Pick<OwnerCourse, "id" | "slug" | "title" | "status" | "includes" | "accessDurationDays">;
export const isPackage = (course: Pick<OwnerCourse, "includes">) => course.includes.length > 0;
/** A bundle holds ordinary courses that are still on offer. */
export const bundleable = (course: BundleCourse) => !isPackage(course) && course.status !== "archived";

export function BundleOptions({ courses, selected, onChange }: { courses: BundleCourse[]; selected: string[]; onChange: (courseIds: string[]) => void }) {
  if (!courses.length) return <p className="text-sm text-muted-foreground">Pakete eklenebilecek başka eğitim yok.</p>;
  return <ul className="grid max-h-[50vh] gap-1 overflow-y-auto">{courses.map(item => <li key={item.id}><label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted/50">
    <Checkbox checked={selected.includes(item.id)} onCheckedChange={checked => onChange(checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />
    <span className="font-medium">{item.title}</span>{item.status !== "published" && <span className="text-xs text-muted-foreground">{courseStatusLabel[item.status]}</span>}
  </label></li>)}</ul>;
}

/** Open while `course` is set; also turns an ordinary course into a package. */
export function PackageContentsDialog({ course, courses, onClose }: { course: BundleCourse | null; courses: BundleCourse[]; onClose: () => void }) {
  return <Dialog open={!!course} onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>Paket içeriği</DialogTitle><DialogDescription>{course && `“${course.title}” satın alındığında öğrenciye seçtiğiniz eğitimlerin hepsi açılır.`}</DialogDescription></DialogHeader>
    {course && <BundleForm key={course.id} course={course} courses={courses} onSaved={onClose} />}
  </DialogContent></Dialog>;
}

function BundleForm({ course, courses, onSaved }: { course: BundleCourse; courses: BundleCourse[]; onSaved: () => void }) {
  const client = useQueryClient(), router = useRouter();
  const [selected, setSelected] = useState(course.includes);
  const save = useMutation({
    mutationFn: (courseIds: string[]) => updateOwnerCourse(course.id, { kind: "bundle", courseIds }),
    // The course list reads the query cache; the package page is rendered on the server.
    onSuccess: () => { toast.success("Paket içeriği kaydedildi."); void client.invalidateQueries({ queryKey: ownerQueryKeys.catalog() }); router.refresh(); onSaved(); },
  });
  const options = courses.filter(item => item.id !== course.id && (bundleable(item) || course.includes.includes(item.id)));
  return <form className="grid gap-5" onSubmit={event => { event.preventDefault(); save.mutate(selected); }}>
    <BundleOptions courses={options} selected={selected} onChange={setSelected} />
    <p className="text-xs text-muted-foreground">Erişim süresi paketin kendi süresidir ({course.accessDurationDays} gün). Hiçbir eğitim seçilmezse bu ürün tek bir eğitim olarak satılır. Önceki satışlar değişmez.</p>
    <DialogFooter><Button type="submit" size="pill" disabled={save.isPending}>{save.isPending && <Spinner />}Kaydet</Button></DialogFooter>
  </form>;
}
