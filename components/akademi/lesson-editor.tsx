"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { CalendarDays, CirclePlay, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addLessons, checkUpload, saveLesson, startUpload } from "@/app/yonetim/egitimler/[courseId]/actions";
import { FormStatus, idleForm } from "./form-status";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import { pillAction } from "@/lib/styles";

const input = "mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";
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
function EditorCard({ row, uploadsEnabled }: { row: Row; uploadsEnabled: boolean }) {
  const { lesson, live } = row;
  const [state, action, pending] = useActionState(saveLesson, idleForm);
  const isLive = lesson.kind === "live";
  return <details className="group rounded-[22px] border border-border bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6"><div><span className="mb-2 block text-[10px] font-semibold tracking-[1.5px] text-stone">{isLive ? "CANLI DERS" : "VİDEO DERS"} · SIRA {lesson.position + 1}</span><h3 className="text-2xl">{lesson.title}</h3></div><span className={`rounded-full px-3 py-1 text-xs ${lesson.status === "published" ? "bg-mist text-forest" : "bg-[#f5ebdd] text-[#82623a]"}`}>{lesson.status === "published" ? "Yayında" : "Taslak"}</span></summary>
    <div className="border-t border-border p-6">
      {!isLive && <VideoUpload row={row} enabled={uploadsEnabled && lesson.status === "draft"} />}
      <form action={action} className="grid gap-5"><input type="hidden" name="courseId" value={lesson.courseId} /><input type="hidden" name="lessonId" value={lesson.id} />
        <label className="text-sm font-medium">Ders başlığı<input className={input} name="title" required maxLength={160} defaultValue={lesson.title} /></label>
        <label className="text-sm font-medium">Açıklama / ders notları<textarea className={input} name="description" rows={4} maxLength={10000} defaultValue={lesson.description} /></label>
        <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Sıra (0 ilk ders)<input className={input} name="position" type="number" required min={0} max={1000} defaultValue={lesson.position} /></label><label className="text-sm font-medium">Görünürlük<select className={input} name="status" defaultValue={lesson.status}><option value="draft">Taslak</option><option value="published">Yayında</option></select></label></div>
        {isLive && <div className="grid gap-5 rounded-2xl bg-[#fbf6ed] p-5 sm:grid-cols-2"><label className="text-sm font-medium">Başlangıç · İstanbul saati<input className={input} type="datetime-local" name="startsAt" defaultValue={localDate(live?.startsAt)} /></label><label className="text-sm font-medium">Süre (dakika)<input className={input} type="number" name="durationMinutes" min={1} max={1440} defaultValue={live?.durationMinutes ?? 60} required /></label><label className="text-sm font-medium sm:col-span-2">Toplantı bağlantısı<input className={input} type="url" name="joinUrl" placeholder="https://…" defaultValue={live?.zoomJoinUrl ?? ""} maxLength={2048} /></label><label className="text-sm font-medium">Toplantı şifresi (isteğe bağlı)<input className={input} name="passcode" defaultValue={live?.zoomPasscode ?? ""} maxLength={100} /></label><label className="text-sm font-medium">Buluşma durumu<select className={input} name="liveStatus" defaultValue={live?.status ?? "scheduled"}><option value="scheduled">Planlandı</option><option value="rescheduled">Yeniden planlandı</option><option value="cancelled">İptal edildi</option><option value="completed">Tamamlandı</option></select></label></div>}
        <div className="flex flex-wrap items-center gap-5"><button className={pillAction} disabled={pending}>{pending ? "Kaydediliyor…" : "Dersi kaydet"}</button><div role="status"><FormStatus state={state} /></div></div>
      </form>
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
