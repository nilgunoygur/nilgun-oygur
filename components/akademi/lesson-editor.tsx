"use client";
import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LazyMotion, Reorder, domMax, useDragControls } from "motion/react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createUpload } from "@mux/upchunk";
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
import { addLessons, attachMuxAsset, checkUpload, deleteLessonFile, listMuxLibrary, prepareLessonFile, previewPlayback, removeLesson, saveLesson, saveLessonOrder, saveLessonFile, startUpload } from "@/app/yonetim/egitimler/[slug]/actions";
import { FormStatus, idleForm, type FormState } from "./form-status";
import { DateTimeField } from "./date-time-field";
import { PublishSwitch } from "./publish-switch";
import { ControlledField, FileButton, FormMessage, FormShell, SelectField, SubmitButton, submitAction, TextField } from "./form-fields";
import { lessonFormSchema } from "@/lib/akademi/owner-forms";
import type { ownerLessons } from "@/lib/akademi/lesson-editor";
import type { AttachedVideo } from "@/lib/video/mux";
import { ownerQueryKeys } from "@/lib/akademi/owner-queries";
import { formatDuration } from "@/lib/akademi/format";
import { formatFileSize, lessonFileProblem, lessonFileRules, lessonFileType, maxLessonDocuments } from "@/lib/akademi/lesson-file-rules";
import { measureAudio } from "@/lib/audio-peaks";
import { LessonAudio } from "./lesson-audio";
import { LessonVideo } from "./lesson-video";
import { plainToHtml } from "@/lib/html";
import { pillAction } from "@/lib/styles";

type Row = Awaited<ReturnType<typeof ownerLessons>>[number] & { video?: AttachedVideo };
const localDate = (date: Date | null | undefined) => date ? new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "";

type Services = { muxConfigured: boolean; filesConfigured: boolean };
const kindLabel = { video: "VİDEO DERS", audio: "SES DERSİ", live: "CANLI DERS" };
const filters = ["all", "video", "audio", "live", "draft"] as const;
type Filter = typeof filters[number];

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
    {!muxConfigured && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Video ve ses yükleme henüz bağlanmadı. Ders başlıklarını, açıklamalarını ve canlı buluşmaları hazırlayabilirsiniz. Kayıtları yükleyip yayınlamak için Mux bağlantısını tamamlayın.</p>}
    {!filesConfigured && <p className="rounded-2xl border border-[#e7d7bc] bg-[#fbf6ed] p-5 text-sm leading-relaxed">Dosya depolama henüz bağlanmadı. Ödev PDF’lerini yüklemek için Vercel Blob bağlantısını tamamlayın.</p>}
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

const ArticleRichEditor = dynamic(() => import("./article-rich-editor").then(module => module.ArticleRichEditor), { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-xl bg-mist" /> });
const visibility = { draft: "Taslak", published: "Yayında" };
const visibilityHint = { draft: "Öğrenciler bu dersi görmez.", published: "Erişimi olan öğrenciler bu dersi görür." };
const liveStatuses = { scheduled: "Planlandı", rescheduled: "Yeniden planlandı", cancelled: "İptal edildi", completed: "Tamamlandı" };

function EditorCard({ row, index, handle, services }: { row: Row; index: number; handle?: React.ReactNode; services: Services }) {
  const { lesson, live } = row;
  const isLive = lesson.kind === "live";
  const form = useForm({
    resolver: zodResolver(lessonFormSchema), mode: "onTouched",
    defaultValues: {
      title: lesson.title, description: lesson.description, status: lesson.status,
      startsAt: localDate(live?.startsAt), durationMinutes: String(live?.durationMinutes ?? 60), meetingId: live?.zoomMeetingId ?? "", passcode: live?.zoomPasscode ?? "", liveStatus: live?.status ?? "scheduled",
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
      <MediaUpload row={row} muxConfigured={services.muxConfigured} />
      <Homework row={row} filesConfigured={services.filesConfigured} />
      <FormShell form={form} onSubmit={submit}>
        <TextField control={form.control} name="title" label="Ders başlığı" maxLength={160} />
        <ControlledField control={form.control} name="description" label="Açıklama / ders notları" description={isLive ? "Öğrenciler bunu buluşmadan önce okur: yanlarında ne olmalı, nasıl hazırlanmalılar?" : undefined}>
          {field => <ArticleRichEditor initialHtml={plainToHtml(field.value)} onChange={field.onChange} />}
        </ControlledField>
        <ControlledField control={form.control} name="status" label="Görünürlük">
          {(field, id) => <PublishSwitch id={id} ref={field.ref} status={field.value} onChange={field.onChange}>{visibility[field.value]}<span className="font-normal text-muted-foreground">· {visibilityHint[field.value]}</span></PublishSwitch>}
        </ControlledField>
        {isLive && <div className="grid gap-5 rounded-2xl bg-[#fbf6ed] p-5 sm:grid-cols-2">
          <DateTimeField control={form.control} name="startsAt" label="Başlangıç" className="bg-white" />
          <TextField control={form.control} name="durationMinutes" label="Süre (dakika)" type="number" inputMode="numeric" min={1} max={1440} className="bg-white" />
          <div className="sm:col-span-2"><TextField control={form.control} name="meetingId" label="Zoom toplantı numarası" description="Katılım bağlantıları her öğrenci için kendi adıyla otomatik oluşturulur." inputMode="numeric" placeholder="852 901 5944" maxLength={40} className="bg-white" /></div>
          <TextField control={form.control} name="passcode" label="Toplantı şifresi (isteğe bağlı)" maxLength={100} className="bg-white" />
          <SelectField control={form.control} name="liveStatus" label="Buluşma durumu" options={liveStatuses} className="bg-white" />
        </div>}
        <div className="flex flex-wrap items-center gap-5"><SubmitButton className={pillAction}>Dersi kaydet</SubmitButton><FormMessage /><DeleteLesson lesson={lesson} /></div>
      </FormShell>
    </div></AccordionPrimitive.Panel>
  </AccordionItem>;
}

/** The message of a finished action; a failed one is thrown, for useMutation. */
async function done(action: Promise<FormState>) {
  const result = await action;
  if (result.status === "error") throw new Error(result.message);
  return result.message;
}

function ConfirmDelete({ title, description, open, onClose, remove, children }: { title: string; description: string; open: boolean; onClose: () => void; remove: { isPending: boolean; error: Error | null; mutate: () => void }; children?: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>“{title}” silinsin mi?</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {children}
      {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" size="pill" disabled={remove.isPending} onClick={onClose}>Vazgeç</Button>
        <Button type="button" variant="destructive" size="pill" disabled={remove.isPending} onClick={remove.mutate}>{remove.isPending ? <Spinner /> : <Trash2 />}Evet, sil</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function DeleteLesson({ lesson }: { lesson: Row["lesson"] }) {
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => done(removeLesson(lesson.courseId, lesson.id)),
    onSuccess: message => { toast.success(message); setOpen(false); },
  });
  return <>
    <Button type="button" variant="destructive" size="pill" className="ml-auto" onClick={() => { remove.reset(); setOpen(true); }}><Trash2 />Dersi sil</Button>
    <ConfirmDelete title={lesson.title} description="Ders, ödev PDF’leriyle birlikte kalıcı olarak silinir ve geri alınamaz. Mux kütüphanenizdeki video veya ses kaydı etkilenmez." open={open} onClose={() => setOpen(false)} remove={{ ...remove, mutate: () => remove.mutate() }}>
      {lesson.status === "published" && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Bu ders yayında. Silindiğinde öğrencileriniz derse erişemez ve bu dersteki ilerleme kayıtları da silinir.</p>}
    </ConfirmDelete>
  </>;
}

const captionLabels = { ready: "Türkçe altyazı hazır", preparing: "Altyazı hazırlanıyor", failed: "Altyazı oluşturulamadı", none: "Altyazı yok" };
const softPill = "border-forest/10 bg-mist text-forest hover:bg-mist/80";
const problem = "rounded-xl bg-destructive/10 p-3 text-sm text-destructive";

// Video and audio lessons share the Mux flow; only the wording and the preview differ.
type MediaKind = "video" | "audio";
const media = {
  video: {
    heading: "DERSİN VİDEOSU", accept: "video/*", fallbackTitle: "Mux videosu", none: "Bu derse henüz video eklenmedi. Aşağıdan bir yol seçin.",
    ready: "Video hazır ve derse bağlandı.", preparing: "Video Mux’ta hazırlanıyor…", current: "Hazır olana kadar mevcut video yayında kalır.",
    libraryHint: "Daha önce yüklediğiniz videolardan birini bu derse bağlayın.", uploadHint: "Dosya buradan doğrudan Mux’a yüklenir, Türkçe altyazı otomatik oluşturulur.", replaces: "Yeni video hazır olunca eskisinin yerini alır.",
    pickTitle: "Bu ders için video seçin", pickHint: "Listede Mux hesabınızdaki videolar var. Seçtiğiniz video yalnızca bu eğitimin öğrencilerine süreli, imzalı bağlantılarla açılır; herkese açık Mux bağlantısı kapatılır.",
    search: "Video adına göre ara…", empty: "Mux hesabınızda henüz video yok. Buradan veya Mux panelinden yükledikten sonra görünür.", progress: "Video yükleme ilerlemesi",
  },
  audio: {
    heading: "DERSİN SES KAYDI", accept: ".mp3,.m4a,.aac,.wav,audio/*", fallbackTitle: "Mux ses kaydı", none: "Bu derse henüz ses kaydı eklenmedi. Aşağıdan bir yol seçin.",
    ready: "Ses kaydı hazır ve derse bağlandı.", preparing: "Ses kaydı Mux’ta hazırlanıyor…", current: "Hazır olana kadar mevcut kayıt yayında kalır.",
    libraryHint: "Daha önce yüklediğiniz ses kayıtlarından birini bu derse bağlayın.", uploadHint: "MP3, M4A veya WAV dosyası buradan doğrudan Mux’a yüklenir.", replaces: "Yeni kayıt hazır olunca eskisinin yerini alır.",
    pickTitle: "Bu ders için ses kaydı seçin", pickHint: "Listede Mux hesabınızdaki ses kayıtları var. Seçtiğiniz kayıt yalnızca bu eğitimin öğrencilerine süreli, imzalı bağlantılarla açılır; herkese açık Mux bağlantısı kapatılır.",
    search: "Kayıt adına göre ara…", empty: "Mux hesabınızda henüz ses kaydı yok. Buradan veya Mux panelinden yükledikten sonra görünür.", progress: "Ses kaydı yükleme ilerlemesi",
  },
};
const recording = {
  ...media.video, heading: "BULUŞMANIN KAYDI", none: "Buluşma bittikten sonra kaydını buraya ekleyin; öğrenciler katılım kutusu yerine kaydı görür.",
  ready: "Kayıt hazır; öğrenciler artık buluşmanın kaydını izleyebilir.", uploadHint: "Zoom kaydı buradan doğrudan Mux’a yüklenir.",
};
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function MediaUpload({ row: { lesson, asset, video }, muxConfigured }: { row: Row; muxConfigured: boolean }) {
  const client = useQueryClient();
  const audio = lesson.kind === "audio", kind: MediaKind = audio ? "audio" : "video", text = lesson.kind === "live" ? recording : media[kind];
  const [percent, setPercent] = useState<number | null>(null);
  const [changing, setChanging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const ready = asset?.status === "ready";
  // Runs to the end even when the card is closed; the lesson keeps its current asset until the new one is ready.
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const peaks = audio ? await measureAudio(file) ?? undefined : undefined;
      const started = await startUpload(lesson.id).catch(() => { throw new Error("Yükleme başlatılamadı. Mux bağlantısını ve yönetim oturumunuzu kontrol edin."); });
      await new Promise<void>((resolve, reject) => {
        const sending = createUpload({ endpoint: started.url, file, chunkSize: 5120 });
        sending.on("progress", event => setPercent(Math.round(event.detail)));
        sending.on("success", () => resolve());
        sending.on("error", () => reject(new Error("Yükleme tamamlanamadı. Dosyayı yeniden seçin.")));
      }).finally(() => setPercent(null));
      // Mux takes a minute or two to prepare a file: a check every five seconds, for ten minutes.
      for (let check = 0; check < 120; check++) {
        const result = await checkUpload(lesson.id, started.uploadId, peaks).catch(() => ({ status: "processing" as const }));
        if (result.status === "ready") return;
        if (result.status === "failed") throw new Error(result.message);
        await sleep(5000);
      }
      throw new Error("Hazırlık uzun sürüyor. Dosya hazır olduğunda Mux kütüphanesinden seçebilirsiniz.");
    },
    onMutate: () => setPreviewing(false),
    onSuccess: () => { setChanging(false); toast.success(text.ready); },
    onSettled: () => client.invalidateQueries({ queryKey: ownerQueryKeys.muxLibrary() }),
  });
  const preview = useQuery({
    queryKey: ownerQueryKeys.preview(lesson.id, asset?.signedPlaybackId),
    queryFn: () => previewPlayback(lesson.id),
    enabled: previewing,
    staleTime: 30 * 60_000,
  });
  const busy = upload.isPending;
  const details = [asset?.durationSeconds && formatDuration(asset.durationSeconds), !audio && video?.captions && captionLabels[video.captions]].filter(Boolean).join(" · ");
  const playback = preview.data && !("error" in preview.data) ? { playbackId: preview.data.playbackId, tokens: preview.data.tokens, metadata: { video_id: lesson.id, video_title: lesson.title, viewer_user_id: "owner-preview" } } : null;
  return <div className="mb-6 grid gap-4 rounded-2xl bg-mist p-5">
    <p className="text-[11px] font-semibold tracking-[1.4px] text-forest">{text.heading}</p>
    {ready ? <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-3">
      {audio ? <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-forest text-white"><Headphones size={20} /></div>
        : video ? <img src={video.thumbnail} alt="" className="aspect-video w-36 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="flex aspect-video w-36 shrink-0 items-center justify-center rounded-lg bg-mist"><CirclePlay className="text-forest" /></div>}
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{video?.title ?? text.fallbackTitle}</p><p className="mt-1 text-xs text-stone">{details}</p></div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="pill" aria-pressed={previewing} onClick={() => setPreviewing(!previewing)}><Eye />{previewing ? "Kapat" : "Önizle"}</Button>
        {muxConfigured && <Button type="button" variant="outline" size="pill" aria-expanded={changing} onClick={() => setChanging(!changing)}><Replace />{changing ? "Vazgeç" : "Değiştir"}</Button>}
      </div>
    </div> : !busy && <p className="text-sm">{text.none}</p>}
    {previewing && (!preview.data ? <Spinner /> : !playback ? <p role="alert" className="text-sm text-destructive">{"error" in preview.data ? preview.data.error : ""}</p>
      : audio ? <LessonAudio {...playback} title={lesson.title} duration={asset?.durationSeconds ?? 0} peaks={asset?.peaks} />
      : <LessonVideo {...playback} className="aspect-video overflow-hidden rounded-xl" />)}
    {busy && <p className="flex items-center gap-2 text-sm" role="status"><Spinner />{percent !== null ? `Dosya Mux’a yükleniyor… %${percent}` : `${text.preparing} ${ready ? text.current : "Bu sayfadan ayrılırsanız dosyayı sonra Mux kütüphanesinden seçebilirsiniz."}`}</p>}
    {percent !== null && <progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label={text.progress} />}
    {muxConfigured && !busy && (!ready || changing) && <div className="grid gap-4 sm:grid-cols-2">
      <MediaOption icon={Library} title="Mux kütüphanesinden seç" hint={text.libraryHint}>
        <MuxLibrary lessonId={lesson.id} kind={kind} currentAssetId={asset?.muxAssetId} onAttached={() => setChanging(false)} />
      </MediaOption>
      <MediaOption icon={Upload} title="Bilgisayardan yükle" hint={`${text.uploadHint}${ready ? ` ${text.replaces}` : ""}`}>
        <FileButton variant="outline" size="pill" className={softPill} accept={text.accept} onFiles={([file]) => upload.mutate(file)}><Upload />Dosya seç</FileButton>
      </MediaOption>
    </div>}
    {upload.error && <p role="alert" className={problem}>{upload.error.message}</p>}
  </div>;
}

function MediaOption({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint: string; children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 text-sm"><p className="mb-1 flex items-center gap-2 font-medium"><Icon size={16} />{title}</p><p className="mb-3 text-xs text-stone">{hint}</p>{children}</div>;
}

type LibraryProps = { lessonId: string; kind: MediaKind; currentAssetId?: string | null; onAttached: () => void };

function MuxLibrary({ lessonId, kind, currentAssetId, onAttached }: LibraryProps) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="pill" className={softPill} onClick={() => setOpen(true)}><Library />Kütüphaneyi aç</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{media[kind].pickTitle}</DialogTitle><DialogDescription>{media[kind].pickHint}</DialogDescription></DialogHeader>
        <LibraryPicker lessonId={lessonId} kind={kind} currentAssetId={currentAssetId} onAttached={() => { setOpen(false); onAttached(); }} />
      </DialogContent>
    </Dialog>
  </>;
}

function LibraryPicker({ lessonId, kind, currentAssetId, onAttached }: LibraryProps) {
  const client = useQueryClient();
  const text = media[kind], audio = kind === "audio";
  const [search, setSearch] = useState("");
  const library = useQuery({
    queryKey: ownerQueryKeys.muxLibrary(),
    queryFn: async () => { const result = await listMuxLibrary(); if ("error" in result) throw new Error(result.error); return result.assets; },
    staleTime: 5 * 60_000,
  });
  const attach = useMutation({
    mutationFn: (assetId: string) => done(attachMuxAsset(lessonId, assetId)),
    onSuccess: message => { toast.success(message); void client.invalidateQueries({ queryKey: ownerQueryKeys.muxLibrary() }); onAttached(); },
  });
  const needle = search.trim().toLocaleLowerCase("tr-TR");
  // An asset still being prepared has no tracks yet, so it is listed for both kinds.
  const ofKind = (library.data ?? []).filter(asset => !asset.ready || asset.audioOnly === audio);
  const assets = ofKind.filter(asset => asset.label.toLocaleLowerCase("tr-TR").includes(needle))
    .sort((a, b) => Number(b.id === currentAssetId) - Number(a.id === currentAssetId));
  return <>
    <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" aria-label="Kütüphanede ara" placeholder={text.search} value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
    {attach.error && <p role="alert" className="text-sm text-destructive">{attach.error.message}</p>}
    {library.isPending ? <p className="flex items-center gap-2 py-6 text-stone"><Spinner />Kütüphane yükleniyor…</p>
      : library.error ? <p role="alert" className="text-destructive">{library.error.message}</p>
      : assets.length === 0 ? <p className="py-6 text-stone">{ofKind.length ? "Aramanızla eşleşen kayıt yok." : text.empty}</p>
      : <ul className="grid gap-3">{assets.map(asset => <li key={asset.id} className={`flex flex-wrap items-center gap-4 rounded-xl border p-3 sm:flex-nowrap ${asset.id === currentAssetId ? "border-forest bg-mist" : "border-border"}`}>
        {audio ? <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mist text-forest"><Headphones size={20} /></div>
          : asset.thumbnail ? <img src={asset.thumbnail} alt="" className="aspect-video w-28 shrink-0 rounded-lg bg-mist object-cover" /> : <div className="aspect-video w-28 shrink-0 rounded-lg bg-mist" />}
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{asset.label}</p><p className="mt-1 text-xs text-stone">{[asset.ready ? formatDuration(asset.durationSeconds) : "Mux’ta hazırlanıyor", !audio && captionLabels[asset.captions]].filter(Boolean).join(" · ")}</p>{asset.id !== currentAssetId && asset.usedBy.length > 0 && <p className="mt-1 text-xs text-[#82623a]">Şu derste de kullanılıyor: {asset.usedBy.join(", ")}</p>}</div>
        {asset.id === currentAssetId ? <span className="inline-flex items-center gap-1 text-sm font-medium text-forest"><Check size={15} />Bu derste</span>
          : <button type="button" className={pillAction} disabled={!asset.ready || attach.isPending} onClick={() => attach.mutate(asset.id)}>{attach.isPending && attach.variables === asset.id ? "Bağlanıyor…" : "Seç"}</button>}
      </li>)}</ul>}
  </>;
}

function Homework({ row: { lesson, documents }, filesConfigured }: { row: Row; filesConfigured: boolean }) {
  const [percent, setPercent] = useState(0);
  const [removing, setRemoving] = useState<Row["documents"][number] | null>(null);
  // Straight from the browser to the private store, then recorded on the lesson.
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const type = lessonFileType(file), invalid = lessonFileProblem({ type, size: file.size });
      if (invalid) throw new Error(`${file.name}: ${invalid}`);
      setPercent(0);
      const prepared = await prepareLessonFile(lesson.id, file.name);
      if ("error" in prepared) throw new Error(prepared.error);
      await put(prepared.pathname, file, { access: "private", token: prepared.token, contentType: type, onUploadProgress: event => setPercent(Math.round(event.percentage)) })
        .catch(() => { throw new Error("Dosya yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin."); });
      return done(saveLessonFile({ lessonId: lesson.id, pathname: prepared.pathname, name: file.name }));
    },
    onSuccess: message => toast.success(message),
  });
  const remove = useMutation({
    mutationFn: () => done(deleteLessonFile(removing!.id)),
    onSuccess: message => { toast.success(message); setRemoving(null); },
  });
  return <div className="mb-6 grid gap-4 rounded-2xl bg-[#fbf6ed] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-semibold tracking-[1.4px] text-[#82623a]">ÖDEV VE MATERYALLER</p><p className="mt-1 text-xs text-stone">Öğrenciler bu PDF’leri dersin altında görür ve indirebilir. {lessonFileRules.hint}</p></div>
      <FileButton variant="outline" size="pill" className={softPill} accept={lessonFileRules.accept} multiple disabled={!filesConfigured || upload.isPending || documents.length >= maxLessonDocuments}
        onFiles={async files => { try { for (const file of files) await upload.mutateAsync(file); } catch { /* shown below */ } }}><Plus />PDF ekle</FileButton>
    </div>
    {documents.length > 0 && <ul className="grid gap-2">{documents.map(file => <li key={file.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
      <FileText className="size-5 shrink-0 text-[#c2553f]" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-stone">PDF · {formatFileSize(file.sizeBytes)}</p></div>
      <Button variant="ghost" size="icon" aria-label={`${file.name}: aç`} nativeButton={false} render={<a href={`/api/lesson-files/${file.id}`} target="_blank" rel="noopener noreferrer" />}><ExternalLink /></Button>
      <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${file.name}: sil`} onClick={() => { remove.reset(); setRemoving(file); }}><Trash2 /></Button>
    </li>)}</ul>}
    {upload.isPending && <div className="grid gap-2" role="status"><p className="flex items-center gap-2 text-sm"><Spinner />Yükleniyor… %{percent}</p><progress className="h-2 w-full accent-forest" max={100} value={percent} aria-label="PDF yükleme ilerlemesi" /></div>}
    {upload.error && <p role="alert" className={problem}>{upload.error.message}</p>}
    <ConfirmDelete title={removing?.name ?? ""} description="PDF kalıcı olarak silinir; öğrencileriniz artık indiremez." open={!!removing} onClose={() => setRemoving(null)} remove={{ ...remove, mutate: () => remove.mutate() }} />
  </div>;
}
