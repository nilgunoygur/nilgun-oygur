"use client";

import { useState } from "react";
import { courseStatusLabel, type OwnerCourse } from "@/lib/akademi/owner-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/** A bundle holds ordinary courses that are still on offer. */
export const bundleable = (course: OwnerCourse) => !course.includes.length && course.status !== "archived";

export function BundleOptions({ courses, selected, onChange }: { courses: OwnerCourse[]; selected: string[]; onChange: (courseIds: string[]) => void }) {
  if (!courses.length) return <p className="text-sm text-muted-foreground">Pakete eklenebilecek başka eğitim yok.</p>;
  return <ul className="grid max-h-[50vh] gap-1 overflow-y-auto">{courses.map(item => <li key={item.id}><label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted/50">
    <Checkbox checked={selected.includes(item.id)} onCheckedChange={checked => onChange(checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />
    <span className="font-medium">{item.title}</span>{item.status !== "published" && <span className="text-xs text-muted-foreground">{courseStatusLabel[item.status]}</span>}
  </label></li>)}</ul>;
}

export function BundleForm({ course, courses, saving, onSave }: { course: OwnerCourse; courses: OwnerCourse[]; saving: boolean; onSave: (courseIds: string[]) => void }) {
  const [selected, setSelected] = useState(course.includes);
  const options = courses.filter(item => item.id !== course.id && (bundleable(item) || course.includes.includes(item.id)));
  return <form className="grid gap-5" onSubmit={event => { event.preventDefault(); onSave(selected); }}>
    <BundleOptions courses={options} selected={selected} onChange={setSelected} />
    <p className="text-xs text-muted-foreground">Erişim süresi paketin kendi süresidir ({course.accessDurationDays} gün). Hiçbir eğitim seçilmezse bu ürün tek bir eğitim olarak satılır. Önceki satışlar değişmez.</p>
    <DialogFooter><Button type="submit" size="pill" disabled={saving}>{saving && <Spinner />}Kaydet</Button></DialogFooter>
  </form>;
}
