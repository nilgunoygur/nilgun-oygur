"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { CalendarDays, Check, CirclePlay, Eye, Library, Plus, Replace, Search, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addLessons, attachMuxAsset, checkUpload, listMuxLibrary, previewPlayback, saveLesson, startUpload } from "@/app/yonetim/egitimler/[courseId]/actions";
import { FormStatus, idleForm, type FormState } from "./form-status";
import { FormMessage, FormShell, SelectField, SubmitButton, submitAction, TextField, TextareaField } from "./form-fields";
import { lessonFormSchema } from "@/lib/akademi/owner-forms";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import type { AttachedVideo } from "@/lib/video/mux";
import { ownerQueryKeys } from "@/lib/akademi/owner-queries";
import { formatDuration } from "@/lib/akademi/format";
import { LessonVideo } from "./lesson-video";
import { pillAction } from "@/lib/styles";

type Row = Awaited<ReturnType<typeof ownerLessons>>[number] & { video?: AttachedVideo };
const localDate = (date: Date | null | undefined) => date ? new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "";

export function CourseEditor({ courseId, rows, muxConfigured }: { courseId: string; rows: Row[]; muxConfigured: boolean }) {
  const [state, action, pending] = useActionState(addLessons, idleForm);
  const [filter, setFilter] = useState<"all" | "video" | "live" | "draft">("all");
  const publishedCount = rows.filter(row => row.lesson.status === "published").length;
  const draftCount = rows.length - publishedCount;
  const visibleRows = rows.filter(row => filter === "all" || filter === "draft" ? filter !== "draft" || row.lesson.status === "draft" : row.lesson.kind === filter);
  return <div className="grid gap-6">
    <Card className="border-forest/10 shadow-sm"><CardContent className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-xl font-semibold text-forest">Eğitim programı</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone">Dersleri ekleyin, sıralayın ve yayınlayın. Taslaklarınızı öğrenciler görmez.</p></div><div className="flex gap-2"><Badge variant="secondary">{publishedCount} yayında</Badge><Badge variant="outline">{draftCount} taslak</Badge></div></div><form action={action} className="mt-5 border-t border-border pt-5"><input type="hidden" name="courseId" value={courseId} /><div className="flex flex-wrap gap-2">{rows.length === 0 && <button className={pillAction} name="kind" value="template" disabled={pending}><Plus size={16} />Örnek program ekle</button>}<button className={pillAction} name="kind" value="video" disabled={pending}><CirclePlay size={16} />Video dersi ekle</button><button className={pillAction} name="kind" value="live" disabled={pending}><CalendarDays size={16} />Canlı ders ekle</button></div><div className="mt-3" role="status"><FormStatus state={state} /></div></form></CardContent></Card>
    {!muxConfigured && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Video yükleme henüz bağlanmadı. Ders başlıklarını, açıklamalarını ve canlı buluşmaları hazırlayabilirsiniz. Kayıtlı videoları yükleyip yayınlamak için Mux bağlantısını tamamlayın.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Tabs value={filter} onValueChange={value => { if (value === "all" || value === "video" || value === "live" || value === "draft") setFilter(value); }}><TabsList className="h-auto flex-wrap"><TabsTrigger value="all">Tüm dersler <span className="ml-1 text-xs text-muted-foreground">{rows.length}</span></TabsTrigger><TabsTrigger value="video">Video <span className="ml-1 text-xs text-muted-foreground">{rows.filter(row => row.lesson.kind === "video").length}</span></TabsTrigger><TabsTrigger value="live">Canlı ders <span className="ml-1 text-xs text-muted-foreground">{rows.filter(row => row.lesson.kind === "live").length}</span></TabsTrigger><TabsTrigger value="draft">Taslaklar <span className="ml-1 text-xs text-muted-foreground">{draftCount}</span></TabsTrigger></TabsList></Tabs><p className="text-xs text-muted-foreground">Sıra numarası en küçük ders önce gösterilir.</p></div>
    {visibleRows.length ? visibleRows.map(row => <EditorCard key={row.lesson.id} row={row} muxConfigured={muxConfigured} />) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{rows.length === 0 ? "Programınız henüz boş. İlk dersinizi ekleyerek başlayın." : "Bu grupta gösterilecek ders yok."}</div>}
  </div>;
}
const visibility = { draft: "Taslak", published: "Yayında" };
const liveStatuses = { scheduled: "Planlandı", rescheduled: "Yeniden planlandı", cancelled: "İptal edildi", completed: "Tamamlandı" };

function EditorCard({ row, muxConfigured }: { row: Row; muxConfigured: boolean }) {
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
      {!isLive && <VideoUpload row={row} muxConfigured={muxConfigured} />}
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

const captionLabels = { ready: "Türkçe altyazı hazır", preparing: "Altyazı hazırlanıyor", failed: "Altyazı oluşturulamadı", none: "Altyazı yok" };
const softPill = "border-forest/10 bg-mist text-forest hover:bg-mist/80";

function VideoUpload({ row: { lesson, asset, video }, muxConfigured }: { row: Row; muxConfigured: boolean }) {
  const router = useRouter();
  const upload = useRef<UpChunk | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const ready = asset?.status === "ready";
  const draft = lesson.status === "draft";
  useEffect(() => () => upload.current?.abort(), []);
  // Mux takes a minute or two to prepare an upload; checkUpload revalidates the page once it is ready.
  const status = useQuery({
    queryKey: ownerQueryKeys.uploadStatus(lesson.id),
    queryFn: () => checkUpload(lesson.id),
    enabled: muxConfigured && !!asset && !ready && percent === null,
    refetchInterval: query => query.state.data?.status === "processing" && query.state.dataUpdateCount < 90 ? 5000 : false,
  });
  const preview = useQuery({
    queryKey: ownerQueryKeys.preview(lesson.id, asset?.signedPlaybackId),
    queryFn: () => previewPlayback(lesson.id),
    enabled: previewing,
    staleTime: 30 * 60_000,
  });
  async function chooseFile(file: File) {
    setError("");
    try {
      const { url } = await startUpload(lesson.id);
      setPercent(0);
      upload.current = createUpload({ endpoint: url, file, chunkSize: 5120 });
      upload.current.on("progress", event => setPercent(Math.round(event.detail)));
      upload.current.on("error", () => { setPercent(null); setError("Yükleme tamamlanamadı. Dosyayı yeniden seçin."); });
      upload.current.on("success", () => { setPercent(null); router.refresh(); });
    } catch { setPercent(null); setError("Yükleme başlatılamadı. Video bağlantısını ve yönetim oturumunuzu kontrol edin."); }
  }
  const details = [asset?.durationSeconds && formatDuration(asset.durationSeconds), video?.captions && captionLabels[video.captions]].filter(Boolean).join(" · ");
  const processingText = status.data?.status === "failed" ? "Video işlenemedi. Dosyayı yeniden yükleyin."
    : status.isFetching || status.data?.status !== "processing" ? "Video Mux’ta hazırlanıyor…" : "Hazırlık uzun sürüyor. Sayfayı biraz sonra yenileyin.";
  return <div className="mb-6 grid gap-4 rounded-2xl bg-mist p-5">
    <p className="text-[11px] font-semibold tracking-[1.4px] text-forest">DERSİN VİDEOSU</p>
    {ready ? <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-3">
      {video ? <img src={video.thumbnail} alt="" className="aspect-video w-36 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="flex aspect-video w-36 shrink-0 items-center justify-center rounded-lg bg-mist"><CirclePlay className="text-forest" /></div>}
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{video?.title ?? "Mux videosu"}</p><p className="mt-1 text-xs text-stone">{details}</p></div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="pill" aria-pressed={previewing} onClick={() => setPreviewing(!previewing)}><Eye />{previewing ? "Kapat" : "Önizle"}</Button>
        {muxConfigured && <Button type="button" variant="outline" size="pill" aria-expanded={changing} onClick={() => setChanging(!changing)}><Replace />{changing ? "Vazgeç" : "Değiştir"}</Button>}
      </div>
    </div> : <p className="flex items-center gap-2 text-sm">{asset ? <>{status.data?.status !== "failed" && <Spinner />}{percent === null ? processingText : "Dosya Mux’a yükleniyor…"}</> : "Bu derse henüz video eklenmedi. Aşağıdan bir yol seçin."}</p>}
    {previewing && (!preview.data ? <Spinner /> : "error" in preview.data ? <p role="alert" className="text-sm text-destructive">{preview.data.error}</p> : <LessonVideo className="aspect-video overflow-hidden rounded-xl" playbackId={preview.data.playbackId} tokens={preview.data.tokens} metadata={{ video_id: lesson.id, video_title: lesson.title, viewer_user_id: "owner-preview" }} />)}
    {muxConfigured && (!ready || changing) && <div className="grid gap-4 sm:grid-cols-2">
      <VideoOption icon={Library} title="Mux kütüphanesinden seç" hint="Mux paneline yüklediğiniz videolardan birini bu derse bağlayın.">
        <MuxLibrary lessonId={lesson.id} currentAssetId={asset?.muxAssetId} onAttached={() => setChanging(false)} />
      </VideoOption>
      <VideoOption icon={Upload} title="Bilgisayardan yükle" hint={draft ? "Dosya Mux’a yüklenir, Türkçe altyazı otomatik oluşturulur." : "Yayındaki derse dosya yüklemek için önce dersi taslağa alın. Kütüphaneden hemen değiştirebilirsiniz."}>
        <Button type="button" variant="outline" size="pill" className={softPill} disabled={!draft || percent !== null} onClick={() => fileInput.current?.click()}><Upload />{percent === null ? "Dosya seç" : "Yükleniyor…"}</Button>
        <input ref={fileInput} className="sr-only" type="file" accept="video/*" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseFile(file); }} />
      </VideoOption>
    </div>}
    {percent !== null && <progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label="Video yükleme ilerlemesi" />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

function VideoOption({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint: string; children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 text-sm"><p className="mb-1 flex items-center gap-2 font-medium"><Icon size={16} />{title}</p><p className="mb-3 text-xs text-stone">{hint}</p>{children}</div>;
}

function MuxLibrary({ lessonId, currentAssetId, onAttached }: { lessonId: string; currentAssetId?: string | null; onAttached: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="pill" className={softPill} onClick={() => setOpen(true)}><Library />Kütüphaneyi aç</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Bu ders için video seçin</DialogTitle><DialogDescription>Listede Mux hesabınızdaki videolar var. Seçtiğiniz video yalnızca bu eğitimin öğrencilerine süreli, imzalı bağlantılarla açılır; herkese açık Mux bağlantısı kapatılır.</DialogDescription></DialogHeader>
        <LibraryPicker lessonId={lessonId} currentAssetId={currentAssetId} onAttached={() => { setOpen(false); onAttached(); }} />
      </DialogContent>
    </Dialog>
  </>;
}

function LibraryPicker({ lessonId, currentAssetId, onAttached }: { lessonId: string; currentAssetId?: string | null; onAttached: () => void }) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const library = useQuery({
    queryKey: ownerQueryKeys.muxLibrary(),
    queryFn: async () => { const result = await listMuxLibrary(); if ("error" in result) throw new Error(result.error); return result.assets; },
    staleTime: 5 * 60_000,
  });
  const attach = useMutation({
    mutationFn: async (assetId: string) => { const result = await attachMuxAsset(lessonId, assetId); if (result.status === "error") throw new Error(result.message); },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ownerQueryKeys.muxLibrary() }); onAttached(); },
  });
  const needle = search.trim().toLocaleLowerCase("tr-TR");
  const assets = (library.data ?? []).filter(asset => asset.label.toLocaleLowerCase("tr-TR").includes(needle))
    .sort((a, b) => Number(b.id === currentAssetId) - Number(a.id === currentAssetId));
  return <>
    <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" aria-label="Video ara" placeholder="Video adına göre ara…" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
    {attach.error && <p role="alert" className="text-sm text-destructive">{attach.error.message}</p>}
    {library.isPending ? <p className="flex items-center gap-2 py-6 text-stone"><Spinner />Videolar yükleniyor…</p>
      : library.error ? <p role="alert" className="text-destructive">{library.error.message}</p>
      : assets.length === 0 ? <p className="py-6 text-stone">{library.data.length ? "Aramanızla eşleşen video yok." : "Mux hesabınızda henüz video yok. Mux panelinden yükledikten sonra burada görünür."}</p>
      : <ul className="grid gap-3">{assets.map(asset => <li key={asset.id} className={`flex flex-wrap items-center gap-4 rounded-xl border p-3 sm:flex-nowrap ${asset.id === currentAssetId ? "border-forest bg-mist" : "border-border"}`}>
        {asset.thumbnail ? <img src={asset.thumbnail} alt="" className="aspect-video w-28 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="aspect-video w-28 shrink-0 rounded-lg bg-mist" />}
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{asset.label}</p><p className="mt-1 text-xs text-stone">{asset.ready ? formatDuration(asset.durationSeconds) : "Mux’ta hazırlanıyor"} · {captionLabels[asset.captions]}</p>{asset.id !== currentAssetId && asset.usedBy.length > 0 && <p className="mt-1 text-xs text-[#82623a]">Şu derste de kullanılıyor: {asset.usedBy.join(", ")}</p>}</div>
        {asset.id === currentAssetId ? <span className="inline-flex items-center gap-1 text-sm font-medium text-forest"><Check size={15} />Bu derste</span>
          : <button type="button" className={pillAction} disabled={!asset.ready || attach.isPending} onClick={() => attach.mutate(asset.id)}>{attach.isPending && attach.variables === asset.id ? "Bağlanıyor…" : "Seç"}</button>}
      </li>)}</ul>}
  </>;
}
