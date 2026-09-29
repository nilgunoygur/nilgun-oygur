"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createUpload, type UpChunk } from "@mux/upchunk";
import dynamic from "next/dynamic";
import { CalendarDays, CirclePlay, Eye, Library, LoaderCircle, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addLessons, attachMuxAsset, checkUpload, listMuxLibrary, previewPlayback, saveLesson, startUpload } from "@/app/yonetim/egitimler/[courseId]/actions";
import { FormStatus, idleForm, type FormState } from "./form-status";
import { FormMessage, FormShell, SelectField, SubmitButton, submitAction, TextField, TextareaField } from "./form-fields";
import { lessonFormSchema } from "@/lib/akademi/owner-forms";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import { pillAction } from "@/lib/styles";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false, loading: () => <div className="aspect-video animate-pulse rounded-xl bg-forest/10" /> });
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
        <div className="flex flex-wrap items-center gap-5"><SubmitButton className={pillAction}>Dersi kaydet</SubmitButton><div role="status"><FormMessage status={saved} /></div></div>
      </FormShell>
    </div>
  </details>;
}

type LibraryResult = Awaited<ReturnType<typeof listMuxLibrary>>;
const minutes = (seconds: number) => seconds < 60 ? `${seconds} sn` : `${Math.floor(seconds / 60)} dk${seconds % 60 ? ` ${seconds % 60} sn` : ""}`;
const captionLabels = { ready: "Türkçe altyazı hazır", preparing: "Altyazı hazırlanıyor", failed: "Altyazı oluşturulamadı", none: "Altyazı yok" };

function VideoUpload({ row, enabled }: { row: Row; enabled: boolean }) {
  const router = useRouter();
  const upload = useRef<UpChunk | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [polling, setPolling] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewPlayback>> | null>(null);
  const ready = row.asset?.status === "ready";
  useEffect(() => () => upload.current?.abort(), []);
  // Mux needs a minute or two after the upload; keep asking instead of making the owner press a button.
  useEffect(() => {
    if (!polling) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const result = await checkUpload(row.lesson.id);
        if (result.status === "processing" && tries < 90) return;
        setPolling(false);
        setMessage(result.status === "ready" ? "Video hazır. Önizleyip dersi yayınlayabilirsiniz." : result.status === "failed" ? "Video işlenemedi. Dosyayı yeniden yükleyin." : "Hazırlık uzun sürüyor. Biraz sonra durumu kontrol edin.");
        if (result.status === "ready") router.refresh();
      } catch { if (tries >= 90) setPolling(false); }
    }, 5000);
    return () => clearInterval(timer);
  }, [polling, row.lesson.id, router]);
  return <div className="mb-6 grid gap-4 rounded-2xl bg-mist p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium">{ready ? "Video hazır" : row.asset ? "Video yükleniyor / hazırlanıyor" : "Henüz video eklenmedi"}{row.asset?.durationSeconds ? ` · ${minutes(row.asset.durationSeconds)}` : ""}</p>
      {ready && <button type="button" className="inline-flex items-center gap-2 text-sm underline underline-offset-4" onClick={() => startTransition(async () => setPreview(preview ? null : await previewPlayback(row.lesson.id)))}><Eye size={15} />{preview ? "Önizlemeyi kapat" : "Öğrenci gibi önizle"}</button>}
    </div>
    {preview && ("error" in preview ? <p role="alert" className="text-sm text-destructive">{preview.error}</p> : <MuxPlayer className="aspect-video overflow-hidden rounded-xl" playbackId={preview.playbackId} tokens={preview.tokens} streamType="on-demand" accentColor="#489b9e" defaultHiddenCaptions metadata={{ video_id: row.lesson.id, video_title: row.lesson.title, viewer_user_id: "owner-preview" }} />)}
    {row.lesson.status === "published" && <p className="text-sm text-stone">Videoyu değiştirmek için dersi taslak olarak kaydedin.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block rounded-xl bg-white p-4 text-sm"><span className="mb-2 flex items-center gap-2 font-medium"><Upload size={16} />Bilgisayardan yükle</span><span className="mb-3 block text-xs text-stone">Türkçe altyazı otomatik oluşturulur.</span><input className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-mist file:px-4 file:py-2 disabled:opacity-50" type="file" accept="video/*" disabled={!enabled || pending || polling || percent !== null && percent < 100} onChange={event => { const file = event.target.files?.[0]; if (!file) return; startTransition(async () => { setMessage(""); try { const { url } = await startUpload(row.lesson.id); setPercent(0); upload.current = createUpload({ endpoint: url, file, chunkSize: 5120 }); upload.current.on("progress", event => setPercent(Math.round(event.detail))); upload.current.on("error", () => { setPercent(null); setMessage("Yükleme tamamlanamadı. Dosyayı yeniden seçin."); }); upload.current.on("success", () => { setPercent(100); setMessage("Dosya yüklendi. Mux videoyu hazırlıyor…"); setPolling(true); router.refresh(); }); } catch { setPercent(null); setMessage("Yükleme başlatılamadı. Video bağlantısını ve yönetim oturumunuzu kontrol edin."); } }); }} /></label>
      <MuxLibrary lessonId={row.lesson.id} enabled={enabled} />
    </div>
    {percent !== null && <progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label="Video yükleme ilerlemesi" />}
    {row.asset && !ready && !polling && <button type="button" className="justify-self-start text-sm underline underline-offset-4" disabled={pending} onClick={() => { setMessage("Mux videoyu hazırlıyor…"); setPolling(true); }}>Video durumunu kontrol et</button>}
    {(message || polling) && <p role="status" className="flex items-center gap-2 text-sm">{polling && <LoaderCircle size={15} className="animate-spin" />}{message}</p>}
  </div>;
}

function MuxLibrary({ lessonId, enabled }: { lessonId: string; enabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryResult | null>(null);
  const [state, setState] = useState<FormState>(idleForm);
  const [pending, startTransition] = useTransition();
  const load = () => startTransition(async () => { setLibrary(null); setLibrary(await listMuxLibrary()); });
  return <div className="rounded-xl bg-white p-4 text-sm">
    <span className="mb-2 flex items-center gap-2 font-medium"><Library size={16} />Mux kütüphanesinden seç</span>
    <span className="mb-3 block text-xs text-stone">Mux panelinden yüklediğiniz videoları derse bağlayın.</span>
    <button type="button" className="rounded-full bg-mist px-4 py-2 disabled:opacity-50" disabled={!enabled} onClick={() => { setOpen(true); setState(idleForm); load(); }}>Videoları göster</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Mux video kütüphanesi</DialogTitle><DialogDescription>Seçtiğiniz video yalnızca bu eğitimin öğrencilerine, süreli imzalı bağlantılarla açılır. Videonun herkese açık Mux bağlantısı kapatılır.</DialogDescription></DialogHeader>
        <FormStatus state={state} />
        {!library ? <p className="flex items-center gap-2 py-6 text-stone"><LoaderCircle size={16} className="animate-spin" />Videolar yükleniyor…</p>
          : "error" in library ? <p role="alert" className="text-destructive">{library.error}</p>
          : library.assets.length === 0 ? <p className="py-6 text-stone">Mux ortamınızda henüz video yok.</p>
          : <ul className="grid gap-3">{library.assets.map(asset => <li key={asset.id} className="flex items-center gap-4 rounded-xl border border-border p-3">
            {asset.thumbnail ? <img src={asset.thumbnail} alt="" className="aspect-video w-28 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="aspect-video w-28 shrink-0 rounded-lg bg-mist" />}
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{asset.title}</p><p className="mt-1 text-xs text-stone">{asset.ready ? minutes(asset.durationSeconds) : "Hazırlanıyor"} · {captionLabels[asset.captions]}{asset.publicPlaybackIds.length ? " · Herkese açık" : ""}</p>{asset.usedBy.length > 0 && <p className="mt-1 text-xs text-[#82623a]">Kullanıldığı ders: {asset.usedBy.join(", ")}</p>}</div>
            <button type="button" className={pillAction} disabled={!asset.ready || pending} onClick={() => startTransition(async () => { const result = await attachMuxAsset(lessonId, asset.id); setState(result); if (result.status === "success") { setOpen(false); router.refresh(); } })}>{pending ? "Bağlanıyor…" : "Bu videoyu kullan"}</button>
          </li>)}</ul>}
      </DialogContent>
    </Dialog>
  </div>;
}
