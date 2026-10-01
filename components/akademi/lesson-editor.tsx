"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LazyMotion, Reorder, domMax, useDragControls } from "motion/react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { put } from "@vercel/blob/client";
import { CalendarDays, Check, CirclePlay, ExternalLink, Eye, FileText, GripVertical, Headphones, Library, Plus, Replace, Search, Trash2, Upload, type LucideIcon } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addLessons, attachMuxAsset, checkUpload, deleteLessonFile, listMuxLibrary, prepareLessonFile, previewPlayback, removeLesson, saveLesson, saveLessonOrder, saveLessonFile, startUpload } from "@/app/yonetim/egitimler/[courseId]/actions";
import { FormStatus, idleForm, type FormState } from "./form-status";
import { FormMessage, FormShell, SelectField, SubmitButton, submitAction, TextField, TextareaField } from "./form-fields";
import { lessonFormSchema } from "@/lib/akademi/owner-forms";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import type { AttachedVideo } from "@/lib/video/mux";
import { ownerQueryKeys } from "@/lib/akademi/owner-queries";
import { formatDuration } from "@/lib/akademi/format";
import { formatFileSize, lessonFileProblem, lessonFileRules, lessonFileType, waveformBars, type LessonFileKind } from "@/lib/akademi/lesson-file-rules";
import { measureAudio } from "@/lib/audio-peaks";
import { LessonAudio } from "./lesson-audio";
import { LessonVideo } from "./lesson-video";
import { pillAction } from "@/lib/styles";

type Row = Awaited<ReturnType<typeof ownerLessons>>[number] & { video?: AttachedVideo };
const localDate = (date: Date | null | undefined) => date ? new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "";

type Services = { muxConfigured: boolean; filesConfigured: boolean };
const kindLabel = { video: "VİDEO DERS", audio: "SES DERSİ", live: "CANLI DERS" };
type Filter = "all" | "video" | "audio" | "live" | "draft";
const filters: Filter[] = ["all", "video", "audio", "live", "draft"];

export function CourseEditor({ courseId, rows, muxConfigured, filesConfigured }: { courseId: string; rows: Row[] } & Services) {
  const [state, action, pending] = useActionState(async (previous: FormState, form: FormData) => {
    const result = await addLessons(previous, form);
    if (result.status === "success") toast.success(result.message);
    return result;
  }, idleForm);
  const [filter, setFilter] = useState<Filter>("all");
  const services = { muxConfigured, filesConfigured };
  const count = (kind: Row["lesson"]["kind"]) => rows.filter(row => row.lesson.kind === kind).length;
  const publishedCount = rows.filter(row => row.lesson.status === "published").length;
  const draftCount = rows.length - publishedCount;
  const visibleRows = rows.filter(row => filter === "all" || filter === "draft" ? filter !== "draft" || row.lesson.status === "draft" : row.lesson.kind === filter);
  return <div className="grid gap-6">
    <Card className="border-forest/10 shadow-sm"><CardContent className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-xl font-semibold text-forest">Eğitim programı</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone">Dersleri ekleyin, sıralayın ve yayınlayın. Taslaklarınızı öğrenciler görmez.</p></div><div className="flex gap-2"><Badge variant="secondary">{publishedCount} yayında</Badge><Badge variant="outline">{draftCount} taslak</Badge></div></div><form action={action} className="mt-5 border-t border-border pt-5"><input type="hidden" name="courseId" value={courseId} /><div className="flex flex-wrap gap-2">{rows.length === 0 && <button className={pillAction} name="kind" value="template" disabled={pending}><Plus size={16} />Örnek program ekle</button>}<button className={pillAction} name="kind" value="video" disabled={pending}><CirclePlay size={16} />Video dersi ekle</button><button className={pillAction} name="kind" value="audio" disabled={pending}><Headphones size={16} />Ses dersi ekle</button><button className={pillAction} name="kind" value="live" disabled={pending}><CalendarDays size={16} />Canlı ders ekle</button></div>{state.status === "error" && <div className="mt-3" role="alert"><FormStatus state={state} /></div>}</form></CardContent></Card>
    {!muxConfigured && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Video yükleme henüz bağlanmadı. Ders başlıklarını, açıklamalarını ve canlı buluşmaları hazırlayabilirsiniz. Kayıtlı videoları yükleyip yayınlamak için Mux bağlantısını tamamlayın.</p>}
    {!filesConfigured && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Dosya depolama henüz bağlanmadı. Ses kayıtlarını ve ödev PDF’lerini yüklemek için Vercel Blob bağlantısını tamamlayın; o zamana kadar ses derslerini taslak olarak hazırlayabilirsiniz.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Tabs value={filter} onValueChange={value => { const next = filters.find(item => item === value); if (next) setFilter(next); }}><TabsList className="h-auto flex-wrap"><TabsTrigger value="all">Tüm dersler <span className="ml-1 text-xs text-muted-foreground">{rows.length}</span></TabsTrigger><TabsTrigger value="video">Video <span className="ml-1 text-xs text-muted-foreground">{count("video")}</span></TabsTrigger><TabsTrigger value="audio">Ses <span className="ml-1 text-xs text-muted-foreground">{count("audio")}</span></TabsTrigger><TabsTrigger value="live">Canlı ders <span className="ml-1 text-xs text-muted-foreground">{count("live")}</span></TabsTrigger><TabsTrigger value="draft">Taslaklar <span className="ml-1 text-xs text-muted-foreground">{draftCount}</span></TabsTrigger></TabsList></Tabs><p className="text-xs text-muted-foreground">{filter === "all" ? "Sıralamak için dersleri tutamacından sürükleyin." : "Sıralamak için “Tüm dersler” sekmesine geçin."}</p></div>
    {visibleRows.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{rows.length === 0 ? "Programınız henüz boş. İlk dersinizi ekleyerek başlayın." : "Bu grupta gösterilecek ders yok."}</div>
      : <Accordion multiple className="gap-4">{filter === "all" ? <SortableLessons courseId={courseId} rows={rows} services={services} />
        : visibleRows.map(row => <EditorCard key={row.lesson.id} row={row} index={rows.indexOf(row)} services={services} />)}</Accordion>}
  </div>;
}

function SortableLessons({ courseId, rows, services }: { courseId: string; rows: Row[]; services: Services }) {
  const serverOrder = rows.map(row => row.lesson.id);
  const serverKey = serverOrder.join();
  const [draft, setDraft] = useState<string[] | null>(null);
  // A new server order replaces the drag draft.
  const [synced, setSynced] = useState(serverKey);
  if (synced !== serverKey) { setSynced(serverKey); setDraft(null); }
  const order = draft ?? serverOrder;
  const save = useMutation({
    mutationFn: async (ids: string[]) => { const result = await saveLessonOrder(courseId, ids); if (result.status === "error") throw new Error(result.message); return result.message; },
    onSuccess: message => toast.success(message),
    onError: error => { setDraft(null); toast.error(error.message); },
  });
  const commit = (ids: string[]) => { if (ids.join() !== serverKey) save.mutate(ids); };
  const move = (id: string, step: number) => {
    const ids = [...order], from = ids.indexOf(id), to = from + step;
    if (to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    setDraft(ids);
    commit(ids);
  };
  const byId = new Map(rows.map(row => [row.lesson.id, row]));
  // Drag needs motion's full feature set; scoped to this admin-only list.
  return <LazyMotion features={domMax}>
    <Reorder.Group as="div" axis="y" values={order} onReorder={setDraft} className="grid gap-4">
      {order.map((id, index) => <SortableLesson key={id} row={byId.get(id)!} index={index} services={services} onDrop={() => commit(order)} onMove={step => move(id, step)} />)}
    </Reorder.Group>
  </LazyMotion>;
}

function SortableLesson({ row, index, services, onDrop, onMove }: { row: Row; index: number; services: Services; onDrop: () => void; onMove: (step: number) => void }) {
  const controls = useDragControls();
  const handle = <button type="button" aria-label="Dersi taşı (yukarı/aşağı ok tuşları)" className="flex cursor-grab touch-none items-center rounded-l-[22px] pl-3 text-stone outline-none hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    onPointerDown={event => controls.start(event)} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); onMove(event.key === "ArrowUp" ? -1 : 1); } }}><GripVertical size={18} /></button>;
  return <Reorder.Item as="div" value={row.lesson.id} dragListener={false} dragControls={controls} onDragEnd={onDrop} layout="position">
    <EditorCard row={row} index={index} handle={handle} services={services} />
  </Reorder.Item>;
}

const visibility = { draft: "Taslak", published: "Yayında" };
const liveStatuses = { scheduled: "Planlandı", rescheduled: "Yeniden planlandı", cancelled: "İptal edildi", completed: "Tamamlandı" };

function EditorCard({ row, index, handle, services }: { row: Row; index: number; handle?: React.ReactNode; services: Services }) {
  const { lesson, live } = row;
  const isLive = lesson.kind === "live";
  const form = useForm({
    resolver: zodResolver(lessonFormSchema), mode: "onTouched",
    defaultValues: {
      title: lesson.title, description: lesson.description, status: lesson.status,
      startsAt: localDate(live?.startsAt), durationMinutes: String(live?.durationMinutes ?? 60), joinUrl: live?.zoomJoinUrl ?? "", passcode: live?.zoomPasscode ?? "", liveStatus: live?.status ?? "scheduled",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(form, () => saveLesson({ ...values, courseId: lesson.courseId, lessonId: lesson.id }), "Ders kaydedilemedi. Yönetim oturumunuzu kontrol edin.");
    if (result) toast.success(result.message);
  });
  return <AccordionItem value={lesson.id} className="rounded-[22px] border border-border bg-white">
    <div className="flex [&>[data-slot=accordion-trigger]]:flex-1 [&>h3]:flex-1">
      {handle}
      <AccordionTrigger className="items-center gap-4 p-6 hover:no-underline"><div className="min-w-0 flex-1"><span className="mb-2 block text-[10px] font-semibold tracking-[1.5px] text-stone">{kindLabel[lesson.kind]} · SIRA {index + 1}</span><span className="block text-2xl">{lesson.title}</span></div><Badge variant={lesson.status === "published" ? "secondary" : "outline"}>{visibility[lesson.status]}</Badge></AccordionTrigger>
    </div>
    <AccordionPrimitive.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"><div className="border-t border-border p-6">
      {lesson.kind === "video" && <VideoUpload row={row} muxConfigured={services.muxConfigured} />}
      {lesson.kind === "audio" && <AudioUpload row={row} filesConfigured={services.filesConfigured} />}
      <Homework row={row} filesConfigured={services.filesConfigured} />
      <FormShell form={form} onSubmit={submit}>
        <TextField control={form.control} name="title" label="Ders başlığı" maxLength={160} />
        <TextareaField control={form.control} name="description" label="Açıklama / ders notları" rows={4} maxLength={10000} />
        <div className="sm:w-1/2"><SelectField control={form.control} name="status" label="Görünürlük" options={visibility} className="bg-white" /></div>
        {isLive && <div className="grid gap-5 rounded-2xl bg-[#fbf6ed] p-5 sm:grid-cols-2">
          <TextField control={form.control} name="startsAt" label="Başlangıç · İstanbul saati" type="datetime-local" className="bg-white" />
          <TextField control={form.control} name="durationMinutes" label="Süre (dakika)" type="number" inputMode="numeric" min={1} max={1440} className="bg-white" />
          <div className="sm:col-span-2"><TextField control={form.control} name="joinUrl" label="Toplantı bağlantısı" type="url" placeholder="https://…" maxLength={2048} className="bg-white" /></div>
          <TextField control={form.control} name="passcode" label="Toplantı şifresi (isteğe bağlı)" maxLength={100} className="bg-white" />
          <SelectField control={form.control} name="liveStatus" label="Buluşma durumu" options={liveStatuses} className="bg-white" />
        </div>}
        <div className="flex flex-wrap items-center gap-5"><SubmitButton className={pillAction}>Dersi kaydet</SubmitButton><FormMessage /><DeleteLesson lesson={lesson} /></div>
      </FormShell>
    </div></AccordionPrimitive.Panel>
  </AccordionItem>;
}

function DeleteLesson({ lesson }: { lesson: Row["lesson"] }) {
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: async () => { const result = await removeLesson(lesson.courseId, lesson.id); if (result.status === "error") throw new Error(result.message); return result.message; },
    onSuccess: message => { toast.success(message); setOpen(false); },
  });
  return <>
    <Button type="button" variant="destructive" size="pill" className="ml-auto" onClick={() => { remove.reset(); setOpen(true); }}><Trash2 />Dersi sil</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>“{lesson.title}” silinsin mi?</DialogTitle><DialogDescription>Ders, ses kaydı ve ödev PDF’leriyle birlikte kalıcı olarak silinir ve geri alınamaz. Mux kütüphanenizdeki video etkilenmez.</DialogDescription></DialogHeader>
        {lesson.status === "published" && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Bu ders yayında. Silindiğinde öğrencileriniz derse erişemez ve bu dersteki ilerleme kayıtları da silinir.</p>}
        {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="pill" disabled={remove.isPending} onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button type="button" variant="destructive" size="pill" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? <Spinner /> : <Trash2 />}Evet, sil</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

const captionLabels = { ready: "Türkçe altyazı hazır", preparing: "Altyazı hazırlanıyor", failed: "Altyazı oluşturulamadı", none: "Altyazı yok" };
const softPill = "border-forest/10 bg-mist text-forest hover:bg-mist/80";

function VideoUpload({ row: { lesson, asset, video }, muxConfigured }: { row: Row; muxConfigured: boolean }) {
  const upload = useRef<UpChunk | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  // Set once the file is with Mux; the lesson keeps its current video until the new one is ready.
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const ready = asset?.status === "ready";
  useEffect(() => () => upload.current?.abort(), []);
  const track = (id: string | null) => { setUploadId(id); setChecks(0); };
  // Mux takes a minute or two to prepare a video; checkUpload attaches it and revalidates the page once it is ready.
  useQuery({
    queryKey: ownerQueryKeys.uploadStatus(lesson.id, uploadId),
    queryFn: async () => {
      const result = await checkUpload(lesson.id, uploadId!);
      setChecks(count => count + 1);
      if (result.status === "ready") { track(null); setChanging(false); toast.success("Video hazır ve derse bağlandı."); }
      if (result.status === "failed") { track(null); setError(result.message); }
      return result;
    },
    enabled: muxConfigured && !!uploadId && percent === null,
    // Ten minutes of checks; after that the video can still be attached from the library.
    refetchInterval: query => query.state.data?.status === "processing" && query.state.dataUpdateCount < 120 ? 5000 : false,
    refetchOnWindowFocus: false, retry: false,
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
      const started = await startUpload(lesson.id);
      setPercent(0);
      upload.current = createUpload({ endpoint: started.url, file, chunkSize: 5120 });
      upload.current.on("progress", event => setPercent(Math.round(event.detail)));
      upload.current.on("error", () => { setPercent(null); setError("Yükleme tamamlanamadı. Dosyayı yeniden seçin."); });
      upload.current.on("success", () => { setPercent(null); track(started.uploadId); });
    } catch { setPercent(null); setError("Yükleme başlatılamadı. Video bağlantısını ve yönetim oturumunuzu kontrol edin."); }
  }
  const busy = percent !== null || !!uploadId;
  const details = [asset?.durationSeconds && formatDuration(asset.durationSeconds), video?.captions && captionLabels[video.captions]].filter(Boolean).join(" · ");
  return <div className="mb-6 grid gap-4 rounded-2xl bg-mist p-5">
    <p className="text-[11px] font-semibold tracking-[1.4px] text-forest">DERSİN VİDEOSU</p>
    {ready ? <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-3">
      {video ? <img src={video.thumbnail} alt="" className="aspect-video w-36 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="flex aspect-video w-36 shrink-0 items-center justify-center rounded-lg bg-mist"><CirclePlay className="text-forest" /></div>}
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{video?.title ?? "Mux videosu"}</p><p className="mt-1 text-xs text-stone">{details}</p></div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="pill" aria-pressed={previewing} onClick={() => setPreviewing(!previewing)}><Eye />{previewing ? "Kapat" : "Önizle"}</Button>
        {muxConfigured && <Button type="button" variant="outline" size="pill" aria-expanded={changing} onClick={() => setChanging(!changing)}><Replace />{changing ? "Vazgeç" : "Değiştir"}</Button>}
      </div>
    </div> : !busy && <p className="text-sm">Bu derse henüz video eklenmedi. Aşağıdan bir yol seçin.</p>}
    {previewing && (!preview.data ? <Spinner /> : "error" in preview.data ? <p role="alert" className="text-sm text-destructive">{preview.data.error}</p> : <LessonVideo className="aspect-video overflow-hidden rounded-xl" playbackId={preview.data.playbackId} tokens={preview.data.tokens} metadata={{ video_id: lesson.id, video_title: lesson.title, viewer_user_id: "owner-preview" }} />)}
    {busy && <p className="flex items-center gap-2 text-sm" role="status"><Spinner />{percent !== null ? `Dosya Mux’a yükleniyor… %${percent}` : checks >= 120 ? "Hazırlık uzun sürüyor. Video hazır olduğunda Mux kütüphanesinden seçebilirsiniz." : `Video Mux’ta hazırlanıyor… ${ready ? "Hazır olana kadar mevcut video yayında kalır." : "Bu sayfadan ayrılırsanız videoyu sonra Mux kütüphanesinden seçebilirsiniz."}`}</p>}
    {percent !== null && <progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label="Video yükleme ilerlemesi" />}
    {muxConfigured && !busy && (!ready || changing) && <div className="grid gap-4 sm:grid-cols-2">
      <VideoOption icon={Library} title="Mux kütüphanesinden seç" hint="Daha önce yüklediğiniz videolardan birini bu derse bağlayın.">
        <MuxLibrary lessonId={lesson.id} currentAssetId={asset?.muxAssetId} onAttached={() => setChanging(false)} />
      </VideoOption>
      <VideoOption icon={Upload} title="Bilgisayardan yükle" hint={`Dosya buradan doğrudan Mux’a yüklenir, Türkçe altyazı otomatik oluşturulur.${ready ? " Yeni video hazır olunca eskisinin yerini alır." : ""}`}>
        <Button type="button" variant="outline" size="pill" className={softPill} onClick={() => fileInput.current?.click()}><Upload />Dosya seç</Button>
        <input ref={fileInput} className="sr-only" type="file" accept="video/*" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseFile(file); }} />
      </VideoOption>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
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
    mutationFn: async (assetId: string) => { const result = await attachMuxAsset(lessonId, assetId); if (result.status === "error") throw new Error(result.message); return result.message; },
    onSuccess: message => { toast.success(message); void client.invalidateQueries({ queryKey: ownerQueryKeys.muxLibrary() }); onAttached(); },
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

type Phase = "measuring" | "uploading" | "saving" | null;
const phaseText = { measuring: "Kayıt inceleniyor…", uploading: "Yükleniyor…", saving: "Kaydediliyor…" };

/** Uploads straight from the browser to the private store, then records the file on the lesson. */
function useFileUpload(lessonId: string, kind: LessonFileKind) {
  const [phase, setPhase] = useState<Phase>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function upload(file: File) {
    const type = lessonFileType(file), problem = lessonFileProblem(kind, { type, size: file.size });
    if (problem) { setError(`${file.name}: ${problem}`); return false; }
    setError("");
    try {
      setPhase("measuring");
      const measured = kind === "audio" ? await measureAudio(file, waveformBars).catch(() => null) : undefined;
      if (measured === null) { setError("Ses dosyası okunamadı. MP3, M4A veya WAV biçiminde yeniden dışa aktarın."); return false; }
      const prepared = await prepareLessonFile({ lessonId, kind, name: file.name, type, size: file.size });
      if ("error" in prepared) { setError(prepared.error); return false; }
      setPercent(0);
      setPhase("uploading");
      abort.current = new AbortController();
      await put(prepared.pathname, file, { access: "private", token: prepared.token, contentType: type, multipart: file.size > 8 * 1024 * 1024, abortSignal: abort.current.signal, onUploadProgress: event => setPercent(Math.round(event.percentage)) });
      setPhase("saving");
      const result = await saveLessonFile({ lessonId, kind, pathname: prepared.pathname, name: file.name, ...measured });
      if (result.status === "error") { setError(result.message); return false; }
      toast.success(result.message);
      return true;
    } catch { setError("Dosya yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin."); return false; }
    finally { setPhase(null); }
  }
  return { phase, percent, error, upload };
}

function UploadProgress({ phase, percent, label }: { phase: Phase; percent: number; label: string }) {
  if (!phase) return null;
  return <div className="grid gap-2" role="status"><p className="flex items-center gap-2 text-sm"><Spinner />{phaseText[phase]}{phase === "uploading" && ` %${percent}`}</p>{phase === "uploading" && <progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label={label} />}</div>;
}

function FilePicker({ kind, disabled, multiple, onFiles, children }: { kind: LessonFileKind; disabled: boolean; multiple?: boolean; onFiles: (files: File[]) => void; children: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <Button type="button" variant="outline" size="pill" className={softPill} disabled={disabled} onClick={() => input.current?.click()}>{children}</Button>
    <input ref={input} className="sr-only" type="file" accept={lessonFileRules[kind].accept} multiple={multiple} tabIndex={-1} onChange={event => { const files = [...(event.target.files ?? [])]; event.target.value = ""; if (files.length) onFiles(files); }} />
  </>;
}

function AudioUpload({ row: { lesson, audio }, filesConfigured }: { row: Row; filesConfigured: boolean }) {
  const { phase, percent, error, upload } = useFileUpload(lesson.id, "audio");
  const [previewing, setPreviewing] = useState(false);
  return <div className="mb-6 grid gap-4 rounded-2xl bg-mist p-5">
    <p className="text-[11px] font-semibold tracking-[1.4px] text-forest">DERSİN SES KAYDI</p>
    {audio ? <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-forest text-white"><Headphones size={20} /></div>
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{audio.name}</p><p className="mt-1 text-xs text-stone">{[audio.durationSeconds && formatDuration(audio.durationSeconds), formatFileSize(audio.sizeBytes)].filter(Boolean).join(" · ")}</p></div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="pill" aria-pressed={previewing} onClick={() => setPreviewing(!previewing)}><Eye />{previewing ? "Kapat" : "Önizle"}</Button>
        <FilePicker kind="audio" disabled={!filesConfigured || !!phase} onFiles={files => { setPreviewing(false); void upload(files[0]); }}><Replace />Değiştir</FilePicker>
      </div>
    </div> : <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4"><div className="text-sm"><p className="font-medium">Bu derse henüz ses kaydı eklenmedi.</p><p className="mt-1 text-xs text-stone">{lessonFileRules.audio.hint} Kayıt yalnızca bu eğitimin öğrencilerine açılır.</p></div><FilePicker kind="audio" disabled={!filesConfigured || !!phase} onFiles={files => void upload(files[0])}><Upload />Ses dosyası seç</FilePicker></div>}
    {previewing && audio && <LessonAudio key={audio.id} src={`/api/lesson-files/${audio.id}`} title={lesson.title} duration={audio.durationSeconds ?? 0} peaks={audio.peaks} />}
    <UploadProgress phase={phase} percent={percent} label="Ses kaydı yükleme ilerlemesi" />
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
  </div>;
}

function Homework({ row: { lesson, documents }, filesConfigured }: { row: Row; filesConfigured: boolean }) {
  const { phase, percent, error, upload } = useFileUpload(lesson.id, "document");
  const [removing, setRemoving] = useState<Row["documents"][number] | null>(null);
  const remove = useMutation({
    mutationFn: async (fileId: string) => { const result = await deleteLessonFile(fileId); if (result.status === "error") throw new Error(result.message); return result.message; },
    onSuccess: message => { toast.success(message); setRemoving(null); },
  });
  return <div className="mb-6 grid gap-4 rounded-2xl bg-[#fbf6ed] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-semibold tracking-[1.4px] text-[#82623a]">ÖDEV VE MATERYALLER</p><p className="mt-1 text-xs text-stone">Öğrenciler bu PDF’leri dersin altında görür ve indirebilir. {lessonFileRules.document.hint}</p></div>
      <FilePicker kind="document" multiple disabled={!filesConfigured || !!phase} onFiles={async files => { for (const file of files) if (!await upload(file)) break; }}><Plus />PDF ekle</FilePicker>
    </div>
    {documents.length > 0 && <ul className="grid gap-2">{documents.map(file => <li key={file.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
      <FileText className="size-5 shrink-0 text-[#c2553f]" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-stone">PDF · {formatFileSize(file.sizeBytes)}</p></div>
      <Button variant="ghost" size="icon" aria-label={`${file.name}: aç`} nativeButton={false} render={<a href={`/api/lesson-files/${file.id}`} target="_blank" rel="noopener noreferrer" />}><ExternalLink /></Button>
      <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${file.name}: sil`} onClick={() => { remove.reset(); setRemoving(file); }}><Trash2 /></Button>
    </li>)}</ul>}
    <UploadProgress phase={phase} percent={percent} label="PDF yükleme ilerlemesi" />
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Dialog open={!!removing} onOpenChange={open => { if (!open) setRemoving(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>“{removing?.name}” silinsin mi?</DialogTitle><DialogDescription>PDF kalıcı olarak silinir; öğrencileriniz artık indiremez.</DialogDescription></DialogHeader>
        {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="pill" disabled={remove.isPending} onClick={() => setRemoving(null)}>Vazgeç</Button>
          <Button type="button" variant="destructive" size="pill" disabled={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>{remove.isPending ? <Spinner /> : <Trash2 />}Evet, sil</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
