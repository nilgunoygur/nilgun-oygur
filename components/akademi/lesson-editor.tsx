"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { CalendarDays, CirclePlay, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addLessons, checkUpload, saveLesson, startUpload } from "@/app/yonetim/egitimler/[courseId]/actions";
import { FormStatus, idleForm, type FormState } from "./form-status";
import { FormRootError, FormShell, SelectField, submitAction, TextField, TextareaField } from "./form-fields";
import { lessonFormSchema } from "@/lib/akademi/owner-forms";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import { pillAction } from "@/lib/styles";

type Row = Awaited<ReturnType<typeof ownerLessons>>[number];
const localDate = (date: Date | null | undefined) => date ? new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "";

export function CourseEditor({ courseId, rows, uploadsEnabled }: { courseId: string; rows: Row[]; uploadsEnabled: boolean }) {
  const [state, action, pending] = useActionState(addLessons, idleForm);
  const [filter, setFilter] = useState<"all" | "video" | "live" | "draft">("all");
  const publishedCount = rows.filter(row => row.lesson.status === "published").length;
  const draftCount = rows.length - publishedCount;
  const visibleRows = rows.filter(row => filter === "all" || filter === "draft" ? filter !== "draft" || row.lesson.status === "draft" : row.lesson.kind === filter);
  return <div className="grid gap-6">
    <Card className="border-forest/10 shadow-sm"><CardContent className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-xl font-semibold text-forest">Eğitim programı</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone">Dersleri ekleyin, sıralayın ve yayınlayın. Taslaklarınızı öğrenciler görmez.</p></div><div className="flex gap-2"><Badge variant="secondary">{publishedCount} yayında</Badge><Badge variant="outline">{draftCount} taslak</Badge></div></div><form action={action} className="mt-5 border-t border-border pt-5"><input type="hidden" name="courseId" value={courseId} /><div className="flex flex-wrap gap-2">{rows.length === 0 && <button className={pillAction} name="kind" value="template" disabled={pending}><Plus size={16} />Örnek program ekle</button>}<button className={pillAction} name="kind" value="video" disabled={pending}><CirclePlay size={16} />Video dersi ekle</button><button className={pillAction} name="kind" value="live" disabled={pending}><CalendarDays size={16} />Canlı ders ekle</button></div><div className="mt-3" role="status"><FormStatus state={state} /></div></form></CardContent></Card>
    {!uploadsEnabled && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Video yükleme henüz bağlanmadı. Ders başlıklarını, açıklamalarını ve canlı buluşmaları hazırlayabilirsiniz. Kayıtlı videoları yükleyip yayınlamak için Mux bağlantısını tamamlayın.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Tabs value={filter} onValueChange={value => { if (value === "all" || value === "video" || value === "live" || value === "draft") setFilter(value); }}><TabsList className="h-auto flex-wrap"><TabsTrigger value="all">Tüm dersler <span className="ml-1 text-xs text-muted-foreground">{rows.length}</span></TabsTrigger><TabsTrigger value="video">Video <span className="ml-1 text-xs text-muted-foreground">{rows.filter(row => row.lesson.kind === "video").length}</span></TabsTrigger><TabsTrigger value="live">Canlı ders <span className="ml-1 text-xs text-muted-foreground">{rows.filter(row => row.lesson.kind === "live").length}</span></TabsTrigger><TabsTrigger value="draft">Taslaklar <span className="ml-1 text-xs text-muted-foreground">{draftCount}</span></TabsTrigger></TabsList></Tabs><p className="text-xs text-muted-foreground">Sıra numarası en küçük ders önce gösterilir.</p></div>
    {visibleRows.length ? visibleRows.map(row => <EditorCard key={row.lesson.id} row={row} uploadsEnabled={uploadsEnabled} />) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{rows.length === 0 ? "Programınız henüz boş. İlk dersinizi ekleyerek başlayın." : "Bu grupta gösterilecek ders yok."}</div>}
  </div>;
}
const visibility = { draft: "Taslak", published: "Yayında" };
const liveStatuses = { scheduled: "Planlandı", rescheduled: "Yeniden planlandı", cancelled: "İptal edildi", completed: "Tamamlandı" };

function EditorCard({ row, uploadsEnabled }: { row: Row; uploadsEnabled: boolean }) {
  const { lesson, live } = row;
  const isLive = lesson.kind === "live";
  const [saved, setSaved] = useState<FormState>(idleForm);
  const form = useForm({
    resolver: zodResolver(lessonFormSchema), mode: "onTouched",
    defaultValues: {
      title: lesson.title, description: lesson.description, position: String(lesson.position), status: lesson.status,
      startsAt: localDate(live?.startsAt), durationMinutes: String(live?.durationMinutes ?? 60), joinUrl: live?.zoomJoinUrl ?? "", passcode: live?.zoomPasscode ?? "", liveStatus: live?.status ?? "scheduled",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setSaved(await submitAction(form, () => saveLesson({ ...values, courseId: lesson.courseId, lessonId: lesson.id }), "Ders kaydedilemedi. Yönetim oturumunuzu kontrol edin.") ?? idleForm);
  });
  const pending = form.formState.isSubmitting;
  return <details className="group rounded-[22px] border border-border bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6"><div><span className="mb-2 block text-[10px] font-semibold tracking-[1.5px] text-stone">{isLive ? "CANLI DERS" : "VİDEO DERS"} · SIRA {lesson.position + 1}</span><h3 className="text-2xl">{lesson.title}</h3></div><span className={`rounded-full px-3 py-1 text-xs ${lesson.status === "published" ? "bg-mist text-forest" : "bg-[#f5ebdd] text-[#82623a]"}`}>{lesson.status === "published" ? "Yayında" : "Taslak"}</span></summary>
    <div className="border-t border-border p-6">
      {!isLive && <VideoUpload row={row} enabled={uploadsEnabled && lesson.status === "draft"} />}
      <FormShell form={form} onSubmit={submit}>
        <TextField control={form.control} name="title" label="Ders başlığı" maxLength={160} />
        <TextareaField control={form.control} name="description" label="Açıklama / ders notları" rows={4} maxLength={10000} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="position" label="Sıra (0 ilk ders)" type="number" inputMode="numeric" min={0} max={1000} />
          <SelectField control={form.control} name="status" label="Görünürlük" options={visibility} className="bg-white" />
        </div>
        {isLive && <div className="grid gap-5 rounded-2xl bg-[#fbf6ed] p-5 sm:grid-cols-2">
          <TextField control={form.control} name="startsAt" label="Başlangıç · İstanbul saati" type="datetime-local" className="bg-white" />
          <TextField control={form.control} name="durationMinutes" label="Süre (dakika)" type="number" inputMode="numeric" min={1} max={1440} className="bg-white" />
          <div className="sm:col-span-2"><TextField control={form.control} name="joinUrl" label="Toplantı bağlantısı" type="url" placeholder="https://…" maxLength={2048} className="bg-white" /></div>
          <TextField control={form.control} name="passcode" label="Toplantı şifresi (isteğe bağlı)" maxLength={100} className="bg-white" />
          <SelectField control={form.control} name="liveStatus" label="Buluşma durumu" options={liveStatuses} className="bg-white" />
        </div>}
        <FormRootError form={form} />
        <div className="flex flex-wrap items-center gap-5"><button className={pillAction} type="submit">{pending ? "Kaydediliyor…" : "Dersi kaydet"}</button><div role="status"><FormStatus state={saved} /></div></div>
      </FormShell>
    </div>
  </details>;
}

function VideoUpload({ row, enabled }: { row: Row; enabled: boolean }) {
  const router = useRouter();
  const upload = useRef<UpChunk | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => () => upload.current?.abort(), []);
  return <div className="mb-6 rounded-2xl bg-mist p-5"><p className="mb-3 text-sm font-medium">{row.asset?.status === "ready" ? "Video hazır" : row.asset ? "Video yükleniyor / hazırlanıyor" : "Henüz video eklenmedi"}{row.asset?.durationSeconds ? ` · ${Math.ceil(row.asset.durationSeconds / 60)} dakika` : ""}</p>
    {row.lesson.status === "published" && <p className="mb-3 text-sm text-stone">Videoyu değiştirmek için dersi taslak olarak kaydedin.</p>}
    <label className="block text-sm"><span className="mb-2 inline-flex items-center gap-2"><Upload size={16} />Video dosyası seçin</span><input className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 disabled:opacity-50" type="file" accept="video/*" disabled={!enabled || pending || percent !== null && percent < 100} onChange={event => { const file = event.target.files?.[0]; if (!file) return; startTransition(async () => { setMessage(""); try { const { url } = await startUpload(row.lesson.id); setPercent(0); upload.current = createUpload({ endpoint: url, file, chunkSize: 5120 }); upload.current.on("progress", event => setPercent(Math.round(event.detail))); upload.current.on("error", () => { setPercent(null); setMessage("Yükleme tamamlanamadı. Dosyayı yeniden seçin."); }); upload.current.on("success", () => { setPercent(100); setMessage("Dosya yüklendi. Hazırlanma durumunu kontrol edin."); router.refresh(); }); } catch { setPercent(null); setMessage("Yükleme başlatılamadı. Video bağlantısını ve yönetim oturumunuzu kontrol edin."); } }); }} /></label>
    {percent !== null && <progress className="mt-4 h-2 w-full accent-forest" max={100} value={percent} aria-label="Video yükleme ilerlemesi" />}
    {row.asset && row.asset.status !== "ready" && <button type="button" className="mt-4 text-sm underline underline-offset-4" disabled={pending} onClick={() => startTransition(async () => { try { const result = await checkUpload(row.lesson.id); setMessage(result.status === "ready" ? "Video hazır. Dersi yayınlayabilirsiniz." : result.status === "failed" ? "Video işlenemedi. Yeniden yükleyin." : "Video hazırlanıyor. Biraz sonra yeniden kontrol edin."); if (result.status === "ready") router.refresh(); } catch { setMessage("Video durumu kontrol edilemedi."); } })}>Video durumunu kontrol et</button>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </div>;
}
