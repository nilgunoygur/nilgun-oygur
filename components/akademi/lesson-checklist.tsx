"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CirclePlay, Headphones, LoaderCircle, LockKeyhole, Paperclip, Video } from "lucide-react";
import { checkLessonAccess, getPlayback, joinLive, updateProgress } from "@/app/akademi/hesabim/[courseId]/actions";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { lessonPrerequisites } from "@/lib/akademi/lesson-sequence";
import type { studentCourse } from "@/lib/akademi/learning";
import { pillAction } from "@/lib/styles";
import { formatDuration } from "@/lib/akademi/format";
import { formatFileSize } from "@/lib/akademi/lesson-file-rules";
import { hasWatched } from "@/lib/akademi/access-policy";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { LessonAudio } from "./lesson-audio";
import { LessonVideo } from "./lesson-video";

type Lesson = NonNullable<Awaited<ReturnType<typeof studentCourse>>>["lessons"][number];
async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  void confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ["#224c40", "#4b999c", "#f1f5e9", "#e7d7bc"], disableForReducedMotion: true });
}
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" });
const kinds = {
  video: { label: "VİDEO DERS", done: "İzledim", locked: "İzleyince açılır", hint: "Videoyu izledikten sonra işaretleyebilirsiniz.", again: "tekrar izleyebilirsiniz" },
  audio: { label: "SES DERSİ", done: "Dinledim", locked: "Dinleyince açılır", hint: "Kaydı dinledikten sonra işaretleyebilirsiniz.", again: "tekrar dinleyebilirsiniz" },
  live: { label: "CANLI BULUŞMA", done: "Katıldım", locked: "", hint: "", again: "tekrar açabilirsiniz" },
};

export function LessonChecklist({ lessons }: { lessons: Lesson[] }) {
  const [completed, setCompleted] = useState(() => new Set(lessons.filter(l => l.completedAt).map(l => l.id)));
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();
  const [accessLost, setAccessLost] = useState(false);
  const prerequisites = lessonPrerequisites(lessons, completed);
  const recorded = lessons.filter(lesson => lesson.kind !== "live");
  const done = recorded.filter(lesson => completed.has(lesson.id)).length;
  // Latest set, not this render's: two saves can finish back to back.
  const latest = useRef(completed);
  function complete(id: string, value: boolean) {
    const next = new Set(latest.current);
    if (value) next.add(id); else next.delete(id);
    latest.current = next;
    setCompleted(next);
    if (value && recorded.some(lesson => lesson.id === id) && recorded.every(lesson => next.has(lesson.id))) void celebrate();
  }
  if (accessLost) return <Alert><LockKeyhole /><AlertTitle>Derslere erişiminiz durduruldu</AlertTitle><AlertDescription>İade talebiniz veya eğitim erişiminizin durumu değişti. Güncel durum hesabınızda gösterilir.</AlertDescription></Alert>;
  return <div>
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5 rounded-[24px] bg-mist p-7">
      <div><p className="mb-2 text-[11px] font-semibold tracking-[1.6px] text-forest">HER ADIM SİZİNLE</p><h2 className="text-[28px]">{done === recorded.length && recorded.length ? "Bu yolculuğu tamamladınız." : "Kendi ritminizde ilerleyin."}</h2><p className="mt-2 text-sm text-stone">Bir dersi sonuna kadar izlediğinizde veya dinlediğinizde tamamlanır. Bir sonraki kayıtlı ders, önceki ders tamamlandığında açılır. Canlı Zoom buluşmalarını bu sıradan bağımsız açabilirsiniz.</p></div>
      <div className="w-full sm:w-52"><p className="mb-3 text-sm"><strong className="text-2xl text-forest">{done}</strong> / {recorded.length} kayıtlı ders tamamlandı</p><progress aria-label="Eğitim ilerlemesi" className="h-2 w-full overflow-hidden rounded-full accent-forest" max={Math.max(recorded.length, 1)} value={done} /></div>
    </div>
    {lessons.length === 0 ? <div className="rounded-[24px] border border-dashed border-border p-12 text-center"><CirclePlay className="mx-auto mb-4 size-9 text-primary" /><h2 className="text-2xl">Dersleriniz hazırlanıyor.</h2><p className="mt-3 text-stone">Erişiminiz aktif. Yayınlanan dersleri burada göreceksiniz.</p></div> : <div className="grid gap-4">{lessons.map((lesson, index) => <LessonCard key={lesson.id} lesson={lesson} index={index} completed={completed.has(lesson.id)} prerequisite={prerequisites.get(lesson.id)?.title ?? null} open={selected === lesson.id && !prerequisites.get(lesson.id)} onAccessLost={() => { setAccessLost(true); router.refresh(); }} onOpen={() => setSelected(selected === lesson.id ? null : lesson.id)} onComplete={value => complete(lesson.id, value)} />)}</div>}
  </div>;
}

function LessonCard({ lesson, index, completed, prerequisite, open, onOpen, onComplete, onAccessLost }: { lesson: Lesson; index: number; completed: boolean; prerequisite: string | null; open: boolean; onOpen: () => void; onComplete: (value: boolean) => void; onAccessLost: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [destination, setDestination] = useState<{ url: string; passcode: string } | null>(null);
  const isLive = lesson.kind === "live", isAudio = lesson.kind === "audio";
  const text = kinds[lesson.kind];
  const duration = lesson.durationSeconds ?? 0;
  const start = lesson.lastPositionSeconds ?? 0;
  const furthest = useRef(start);
  const [watched, setWatched] = useState(isLive || !duration || hasWatched(start, duration));
  const locked = Boolean(prerequisite) || (!completed && !watched);
  const accessLost = useRef(onAccessLost);
  useEffect(() => { accessLost.current = onAccessLost; }, [onAccessLost]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const check = async () => {
      const result = await checkLessonAccess(lesson.id);
      if (active && result.allowed === false) accessLost.current();
    };
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    const timer = setInterval(() => { void check(); }, 15000);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [open, lesson.id]);
  function progress(seconds: number) {
    furthest.current = Math.max(furthest.current, seconds);
    if (!watched && hasWatched(seconds, duration)) setWatched(true);
  }
  const finish = () => { progress(duration); startTransition(() => mark(true)); };
  async function mark(value: boolean) {
    setError("");
    try {
      const result = await updateProgress({ lessonId: lesson.id, completed: value, position: value && !isLive ? Math.floor(furthest.current) : undefined });
      if (result.ok) onComplete(value); else setError(result.error ?? "Kaydedilemedi.");
    } catch { setError("İlerlemeniz kaydedilemedi. Lütfen yeniden deneyin."); }
  }
  return <article className={`overflow-hidden rounded-[22px] border transition-colors ${completed ? "border-[#c7dccd] bg-[#f7faf5]" : "border-border bg-white"}`}>
    <div className="flex items-start gap-4 p-5 sm:items-center sm:gap-6 sm:p-7">
      <div className={`hidden size-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${isLive ? "bg-[#f5ebdd] text-[#997348]" : "bg-mist text-forest"}`}>{isLive ? <Video size={24} /> : isAudio ? <Headphones size={24} /> : <CirclePlay size={26} />}</div>
      <div className="min-w-0 flex-1"><p className="mb-2 text-[10px] font-semibold tracking-[1.6px] text-stone">{String(index + 1).padStart(2, "0")} · {text.label}</p><h3 className="text-[23px] leading-snug">{lesson.title}</h3>{prerequisite && <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5 shrink-0" />Önce “{prerequisite}” dersini tamamlayın.</p>}<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone">{isLive && lesson.startsAt ? <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{date.format(new Date(lesson.startsAt))} · İstanbul</span> : <span>{lesson.durationSeconds ? formatDuration(lesson.durationSeconds) : lesson.moduleTitle}</span>}{lesson.documents.length > 0 && <span className="inline-flex items-center gap-1.5"><Paperclip size={13} />{lesson.documents.length} ödev PDF’i</span>}{isLive && lesson.liveStatus === "cancelled" && <span className="text-destructive">İptal edildi</span>}{isLive && lesson.liveStatus === "completed" && <span>Tamamlandı</span>}</div></div>
      <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center">
        <label className={cn("flex items-center gap-2 text-sm", locked ? "cursor-not-allowed text-stone" : "cursor-pointer text-forest")} title={prerequisite ? `Önce ${prerequisite} dersini tamamlayın.` : locked ? text.hint : undefined}>
          <Checkbox className="size-5 rounded-[5px] border-forest/40 bg-white data-checked:border-forest data-checked:bg-forest data-checked:text-white" aria-label={`${lesson.title}: ${text.done.toLocaleLowerCase("tr-TR")}`} checked={completed} disabled={pending || locked} onCheckedChange={value => startTransition(() => mark(value))} />
          <span className="hidden sm:inline">{pending ? "Kaydediliyor" : completed ? "Tamamlandı" : prerequisite ? "Önceki ders" : locked ? text.locked : text.done}</span>
        </label>
        <button type="button" onClick={onOpen} disabled={Boolean(prerequisite)} aria-expanded={open} aria-controls={`lesson-${lesson.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50">{prerequisite ? "Kilitli" : isLive ? "Detaylar" : "Dersi aç"}<ChevronDown size={15} className={open ? "rotate-180" : ""} /></button>
      </div>
    </div>
    {error && <p role="alert" className="px-7 pb-5 text-sm text-destructive">{error}</p>}
    {open && <div id={`lesson-${lesson.id}`} className="border-t border-border p-5 sm:p-7">
      {lesson.description && <p className="mb-6 max-w-[75ch] whitespace-pre-wrap leading-relaxed text-stone">{lesson.description}</p>}
      {isLive ? <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-[#f8f2e9] p-6"><div className="flex-1"><h4 className="text-xl">Birlikte buluşalım.</h4><p className="mt-2 text-sm text-stone">{lesson.durationMinutes ?? 60} dakika · Katılım ders başlamadan 30 dakika önce açılır.</p></div>{destination ? <div><a href={destination.url} target="_blank" rel="noopener noreferrer" className={pillAction}>Canlı derse katıl <ArrowUpRight size={16} /></a>{destination.passcode && <p className="mt-2 text-sm">Toplantı şifresi: {destination.passcode}</p>}</div> : <button type="button" className={pillAction} disabled={pending || lesson.liveStatus === "cancelled" || lesson.liveStatus === "completed"} onClick={() => startTransition(async () => { setError(""); const result = await joinLive(lesson.id); if (result.destination) setDestination(result.destination); else setError(result.error ?? "Katılım henüz açılmadı."); })}>Katılımı aç <ArrowUpRight size={16} /></button>}</div> : !lesson.mediaReady ? <p className="rounded-2xl bg-mist p-6 text-stone">{isAudio ? "Ses kaydı" : "Video"} hazırlanıyor. Lütfen daha sonra yeniden deneyin.</p>
        : isAudio ? <AudioLesson lessonId={lesson.id} title={lesson.title} duration={duration} peaks={lesson.peaks} startTime={start} onTime={progress} onEnded={finish} />
        : <LessonPlayer lessonId={lesson.id} title={lesson.title} startTime={start} onTime={progress} onEnded={finish} />}
      {lesson.documents.length > 0 && <Homework documents={lesson.documents} />}
      {completed && <p className="mt-5 flex items-center gap-2 text-sm text-forest"><Check size={16} />Bu dersi tamamladınız. Dilediğiniz zaman {text.again}.</p>}
    </div>}
  </article>;
}

/** Saves the position at most every 15 seconds, one save at a time. */
function useSavedPosition(lessonId: string, startTime: number, onTime: (seconds: number) => void) {
  const [progressError, setProgressError] = useState("");
  const lastSaved = useRef(0);
  const position = useRef(startTime);
  const saves = useRef(Promise.resolve());
  function savePosition(time: number) {
    if (!Number.isFinite(time)) return;
    position.current = time;
    onTime(time);
    if (Date.now() - lastSaved.current < 15000) return;
    lastSaved.current = Date.now();
    saves.current = saves.current.then(async () => {
      const result = await updateProgress({ lessonId, position: Math.floor(time) });
      setProgressError(result.ok ? "" : "İzleme konumunuz kaydedilemedi.");
    }).catch(() => setProgressError("İzleme konumunuz kaydedilemedi."));
  }
  return { position, savePosition, progressError, setProgressError };
}

type PlayerProps = { lessonId: string; title: string; startTime: number; onTime: (seconds: number) => void; onEnded: () => void };

type Playback = Awaited<ReturnType<typeof getPlayback>>;
const playable = (playback: Playback) => playback.playbackId && playback.tokens ? { playbackId: playback.playbackId, tokens: playback.tokens } : null;

// One token lasts a sitting; the player asks for another only if playback fails.
function AudioLesson({ lessonId, title, duration, peaks, startTime, onTime, onEnded }: PlayerProps & { duration: number; peaks: number[] | null }) {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const { savePosition, progressError } = useSavedPosition(lessonId, startTime, onTime);
  useEffect(() => {
    let active = true;
    getPlayback(lessonId).then(result => { if (active) setPlayback(result); }, () => { if (active) setPlayback({ error: "Ses kaydı başlatılamadı. Dersi kapatıp yeniden açın." }); });
    return () => { active = false; };
  }, [lessonId]);
  const source = playback && playable(playback);
  if (!playback) return <div className="flex h-44 items-center justify-center rounded-[22px] bg-forest text-white"><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-label="Ses kaydı yükleniyor" /></div>;
  if (!source) return <p role="alert" className="rounded-2xl bg-mist p-6">{playback.error}</p>;
  return <div><LessonAudio {...source} title={title} duration={duration} peaks={peaks} startTime={startTime} metadata={{ video_id: lessonId, video_title: title }} refresh={async () => playable(await getPlayback(lessonId))} onTime={savePosition} onEnded={onEnded} />{progressError && <p role="alert" className="mt-3 text-sm text-destructive">{progressError}</p>}</div>;
}

type Document = Lesson["documents"][number];
const withoutExtension = (name: string) => name.replace(/\.pdf$/i, "");

function Homework({ documents }: { documents: Document[] }) {
  return <section className="mt-6 rounded-2xl bg-[#fbf6ed] p-5 sm:p-6" aria-label="Ödev ve materyaller">
    <p className="text-[11px] font-semibold tracking-[1.6px] text-[#82623a]">ÖDEV VE MATERYALLER</p>
    <p className="mt-1 mb-4 text-sm text-stone">Dersin ardından uygulamanız için hazırlandı. Dilediğiniz zaman açıp indirebilirsiniz.</p>
    <ul className="grid gap-3 sm:grid-cols-2">{documents.map(file => <li key={file.id}>
      <a href={`/api/lesson-files/${file.id}`} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-[#eadfcb] bg-white p-3.5 transition-colors hover:border-[#c9ad7c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span aria-hidden className="relative flex h-14 w-11 shrink-0 items-end justify-center rounded-md bg-[#fbf6ed] pb-1.5 ring-1 ring-[#eadfcb] after:absolute after:top-0 after:right-0 after:size-3 after:rounded-bl-md after:bg-[#eadfcb]"><span className="rounded-[4px] bg-[#c2553f] px-1 text-[9px] font-bold tracking-wide text-white">PDF</span></span>
        <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[15px] leading-snug font-medium break-words">{withoutExtension(file.name)}</span><span className="mt-1 block text-xs text-stone">PDF · {formatFileSize(file.sizeBytes)}</span></span>
        <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-mist px-3.5 text-sm text-forest transition-colors group-hover:bg-forest group-hover:text-white">Aç<ArrowUpRight size={15} /></span>
      </a>
    </li>)}</ul>
  </section>;
}

function LessonPlayer({ lessonId, title, startTime, onTime, onEnded }: PlayerProps) {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const { position, savePosition, progressError, setProgressError } = useSavedPosition(lessonId, startTime, onTime);
  const playing = useRef(false);
  const [resume, setResume] = useState({ time: startTime, playing: false });
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await getPlayback(lessonId); if (active) { setResume({ time: position.current, playing: playing.current }); setPlayback(result); } }
      catch { if (active) setPlayback({ error: "Video bağlantısı yenilenemedi. Dersi kapatıp yeniden açın." }); }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [lessonId, position]);
  if (!playback) return <div className="flex aspect-video items-center justify-center rounded-2xl bg-mist"><LoaderCircle className="animate-spin" aria-label="Video yükleniyor" /></div>;
  if (playback.error || !playback.playbackId) return <p role="alert" className="rounded-2xl bg-mist p-6">{playback.error}</p>;
  return <div><LessonVideo key={playback.expiresAt} playbackId={playback.playbackId} tokens={playback.tokens} metadata={{ video_id: lessonId, video_title: title }} startTime={resume.time} autoPlay={resume.playing} onPlaying={() => { playing.current = true; }} onPause={() => { playing.current = false; }} onEnded={() => { playing.current = false; onEnded(); }} onTimeUpdate={event => { const target = event.currentTarget; if (target && "currentTime" in target && typeof target.currentTime === "number") savePosition(target.currentTime); }} onError={() => setProgressError("Video oynatılamadı. Bağlantınızı kontrol edip dersi yeniden açın.")} />{progressError && <p role="alert" className="mt-3 text-sm text-destructive">{progressError}</p>}</div>;
}
