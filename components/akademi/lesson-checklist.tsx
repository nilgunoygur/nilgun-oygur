"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CirclePlay, LoaderCircle, Video } from "lucide-react";
import { getPlayback, joinLive, updateProgress } from "@/app/akademi/hesabim/[courseId]/actions";
import type { studentCourse } from "@/lib/akademi/learning";
import { pillAction } from "@/lib/styles";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false, loading: () => <div className="aspect-video animate-pulse bg-forest/10" /> });
type Lesson = NonNullable<Awaited<ReturnType<typeof studentCourse>>>["lessons"][number];
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" });

export function LessonChecklist({ lessons }: { lessons: Lesson[] }) {
  const [completed, setCompleted] = useState(() => new Set(lessons.filter(l => l.completedAt).map(l => l.id)));
  const [selected, setSelected] = useState<string | null>(null);
  const done = completed.size;
  return <div>
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5 rounded-[24px] bg-mist p-7">
      <div><p className="mb-2 text-[11px] font-semibold tracking-[1.6px] text-forest">HER ADIM SİZİNLE</p><h2 className="text-[28px]">{done === lessons.length && lessons.length ? "Bu yolculuğu tamamladınız." : "Kendi ritminizde ilerleyin."}</h2><p className="mt-2 text-sm text-stone">Videolar bittiğinde işaretlenir. Dilerseniz siz de izledim olarak işaretleyebilirsiniz.</p></div>
      <div className="w-full sm:w-52"><p className="mb-3 text-sm"><strong className="text-2xl text-forest">{done}</strong> / {lessons.length} ders tamamlandı</p><progress aria-label="Eğitim ilerlemesi" className="h-2 w-full overflow-hidden rounded-full accent-forest" max={Math.max(lessons.length, 1)} value={done} /></div>
    </div>
    {lessons.length === 0 ? <div className="rounded-[24px] border border-dashed border-border p-12 text-center"><CirclePlay className="mx-auto mb-4 size-9 text-primary" /><h2 className="text-2xl">Dersleriniz hazırlanıyor.</h2><p className="mt-3 text-stone">Erişiminiz aktif. Yayınlanan dersleri burada göreceksiniz.</p></div> : <div className="grid gap-4">{lessons.map((lesson, index) => <LessonCard key={lesson.id} lesson={lesson} index={index} completed={completed.has(lesson.id)} open={selected === lesson.id} onOpen={() => setSelected(selected === lesson.id ? null : lesson.id)} onComplete={value => setCompleted(previous => { const next = new Set(previous); if (value) next.add(lesson.id); else next.delete(lesson.id); return next; })} />)}</div>}
  </div>;
}

function LessonCard({ lesson, index, completed, open, onOpen, onComplete }: { lesson: Lesson; index: number; completed: boolean; open: boolean; onOpen: () => void; onComplete: (value: boolean) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [destination, setDestination] = useState<{ url: string; passcode: string } | null>(null);
  const isLive = lesson.kind === "live";
  async function mark(value: boolean) {
    setError("");
    try {
      const result = await updateProgress({ lessonId: lesson.id, completed: value });
      if (result.ok) onComplete(value); else setError(result.error ?? "Kaydedilemedi.");
    } catch { setError("İlerlemeniz kaydedilemedi. Lütfen yeniden deneyin."); }
  }
  return <article className={`overflow-hidden rounded-[22px] border transition-colors ${completed ? "border-[#c7dccd] bg-[#f7faf5]" : "border-border bg-white"}`}>
    <div className="flex items-start gap-4 p-5 sm:items-center sm:gap-6 sm:p-7">
      <div className={`hidden size-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${isLive ? "bg-[#f5ebdd] text-[#997348]" : "bg-mist text-forest"}`}>{isLive ? <Video size={24} /> : <CirclePlay size={26} />}</div>
      <div className="min-w-0 flex-1"><p className="mb-2 text-[10px] font-semibold tracking-[1.6px] text-stone">{String(index + 1).padStart(2, "0")} · {isLive ? "CANLI BULUŞMA" : "VİDEO DERS"}</p><h3 className="text-[23px] leading-snug">{lesson.title}</h3><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone">{isLive && lesson.startsAt ? <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{date.format(new Date(lesson.startsAt))} · İstanbul</span> : <span>{lesson.durationSeconds ? `${Math.ceil(lesson.durationSeconds / 60)} dakika` : lesson.moduleTitle}</span>}{isLive && lesson.liveStatus === "cancelled" && <span className="text-destructive">İptal edildi</span>}{isLive && lesson.liveStatus === "completed" && <span>Tamamlandı</span>}</div></div>
      <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-forest"><input type="checkbox" className="size-5 accent-forest" aria-label={`${lesson.title}: izledim`} checked={completed} disabled={pending} onChange={e => { const value = e.target.checked; startTransition(() => mark(value)); }} /><span className="hidden sm:inline">{pending ? "Kaydediliyor" : completed ? "Tamamlandı" : "İzledim"}</span></label>
        <button type="button" onClick={onOpen} aria-expanded={open} aria-controls={`lesson-${lesson.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-mist">{isLive ? "Detaylar" : "Dersi aç"}<ChevronDown size={15} className={open ? "rotate-180" : ""} /></button>
      </div>
    </div>
    {error && <p role="alert" className="px-7 pb-5 text-sm text-destructive">{error}</p>}
    {open && <div id={`lesson-${lesson.id}`} className="border-t border-border p-5 sm:p-7">
      {lesson.description && <p className="mb-6 max-w-[75ch] whitespace-pre-wrap leading-relaxed text-stone">{lesson.description}</p>}
      {isLive ? <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-[#f8f2e9] p-6"><div className="flex-1"><h4 className="text-xl">Birlikte buluşalım.</h4><p className="mt-2 text-sm text-stone">{lesson.durationMinutes ?? 60} dakika · Katılım ders başlamadan 30 dakika önce açılır.</p></div>{destination ? <div><a href={destination.url} target="_blank" rel="noopener noreferrer" className={pillAction}>Canlı derse katıl <ArrowUpRight size={16} /></a>{destination.passcode && <p className="mt-2 text-sm">Toplantı şifresi: {destination.passcode}</p>}</div> : <button type="button" className={pillAction} disabled={pending || lesson.liveStatus === "cancelled" || lesson.liveStatus === "completed"} onClick={() => startTransition(async () => { setError(""); const result = await joinLive(lesson.id); if (result.destination) setDestination(result.destination); else setError(result.error ?? "Katılım henüz açılmadı."); })}>Katılımı aç <ArrowUpRight size={16} /></button>}</div> : lesson.videoReady ? <LessonPlayer lessonId={lesson.id} startTime={lesson.lastPositionSeconds ?? 0} onEnded={() => startTransition(() => mark(true))} /> : <p className="rounded-2xl bg-mist p-6 text-stone">Video hazırlanıyor. Lütfen daha sonra yeniden deneyin.</p>}
      {completed && <p className="mt-5 flex items-center gap-2 text-sm text-forest"><Check size={16} />Bu dersi tamamladınız. Dilediğiniz zaman tekrar izleyebilirsiniz.</p>}
    </div>}
  </article>;
}

function LessonPlayer({ lessonId, startTime, onEnded }: { lessonId: string; startTime: number; onEnded: () => void }) {
  const [playback, setPlayback] = useState<Awaited<ReturnType<typeof getPlayback>> | null>(null);
  const [progressError, setProgressError] = useState("");
  const lastSaved = useRef(0);
  const position = useRef(startTime);
  const playing = useRef(false);
  const [resume, setResume] = useState({ time: startTime, playing: false });
  const saves = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await getPlayback(lessonId); if (active) { setResume({ time: position.current, playing: playing.current }); setPlayback(result); } }
      catch { if (active) setPlayback({ error: "Video bağlantısı yenilenemedi. Dersi kapatıp yeniden açın." }); }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [lessonId]);
  function savePosition(time: number) {
    if (Number.isFinite(time)) position.current = time;
    if (!Number.isFinite(time) || Date.now() - lastSaved.current < 15000) return;
    lastSaved.current = Date.now();
    saves.current = saves.current.then(async () => {
      const result = await updateProgress({ lessonId, position: Math.floor(time) });
      setProgressError(result.ok ? "" : "İzleme konumunuz kaydedilemedi.");
    }).catch(() => setProgressError("İzleme konumunuz kaydedilemedi."));
  }
  if (!playback) return <div className="flex aspect-video items-center justify-center rounded-2xl bg-mist"><LoaderCircle className="animate-spin" aria-label="Video yükleniyor" /></div>;
  if (playback.error || !playback.playbackId) return <p role="alert" className="rounded-2xl bg-mist p-6">{playback.error}</p>;
  return <div><MuxPlayer key={playback.expiresAt} className="aspect-video overflow-hidden rounded-2xl" playbackId={playback.playbackId} tokens={playback.tokens} streamType="on-demand" accentColor="#489b9e" startTime={resume.time} autoPlay={resume.playing} onPlaying={() => { playing.current = true; }} onPause={() => { playing.current = false; }} onEnded={() => { playing.current = false; onEnded(); }} onTimeUpdate={event => { const target = event.currentTarget; if (target && "currentTime" in target && typeof target.currentTime === "number") savePosition(target.currentTime); }} onError={() => setProgressError("Video oynatılamadı. Bağlantınızı kontrol edip dersi yeniden açın.")} />{progressError && <p role="alert" className="mt-3 text-sm text-destructive">{progressError}</p>}</div>;
}
