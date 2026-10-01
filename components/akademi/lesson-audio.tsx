"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

const clock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds)), hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, "0")}` : minutes}:${String(total % 60).padStart(2, "0")}`;
};
const speeds = [1, 1.25, 1.5, 2, 0.75];
// Recordings uploaded without a measurable waveform still get a calm, repeatable outline.
const neutralPeaks = Array.from({ length: 96 }, (_, i) => Math.round(38 + 26 * Math.sin(i * 0.55) + 18 * Math.sin(i * 1.9 + 1)));

type Props = {
  src: string; title: string; duration: number; peaks?: number[] | null; startTime?: number; className?: string;
  onTime?: (seconds: number) => void; onEnded?: () => void;
};

/** Audio lesson player with a waveform scrubber; the owner preview and student lessons must look the same. */
export function LessonAudio({ src, title, duration: knownDuration, peaks, startTime = 0, className, onTime, onEnded }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const resumeAt = useRef(startTime);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [time, setTime] = useState(startTime);
  const [duration, setDuration] = useState(knownDuration);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const retried = useRef(false);

  const seek = (seconds: number) => {
    const next = Math.min(Math.max(seconds, 0), duration);
    setTime(next);
    resumeAt.current = next;
    if (audio.current) audio.current.currentTime = next;
  };
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    setError("");
    if (element.paused) element.play().catch(() => setError("Ses kaydı başlatılamadı. Bağlantınızı kontrol edip yeniden deneyin."));
    else element.pause();
  };
  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  };
  // A signed link can expire mid-lesson: ask for a fresh one once, then continue where the listener was.
  const recover = () => {
    const element = audio.current;
    if (!element || retried.current) { setPlaying(false); setWaiting(false); setError("Ses kaydı yüklenemedi. Dersi kapatıp yeniden açın."); return; }
    retried.current = true;
    element.src = `${src}?r=${Date.now()}`;
    element.load();
    if (playing) element.play().catch(() => setPlaying(false));
  };

  return <div className={cn("rounded-[22px] bg-forest p-5 text-white shadow-[0_18px_40px_-28px_rgba(34,76,64,0.9)] sm:p-7", className)}>
    <audio ref={audio} src={src} preload="metadata" className="hidden"
      onLoadedMetadata={event => { const element = event.currentTarget; if (Number.isFinite(element.duration) && element.duration > 0) setDuration(element.duration); if (resumeAt.current > 0) element.currentTime = Math.min(resumeAt.current, element.duration || resumeAt.current); element.playbackRate = speed; }}
      onTimeUpdate={event => { const seconds = event.currentTarget.currentTime; setTime(seconds); resumeAt.current = seconds; retried.current = false; onTime?.(seconds); }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
      onEnded={() => { setPlaying(false); onEnded?.(); }} onError={recover} />
    <div className="flex items-center gap-4 sm:gap-6">
      <button type="button" onClick={toggle} aria-label={playing ? `${title}: duraklat` : `${title}: oynat`} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-forest transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95 motion-reduce:transition-none sm:size-16">
        {waiting && playing ? <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" /> : playing ? <Pause className="size-6 fill-current" /> : <Play className="ml-1 size-6 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <Waveform peaks={peaks?.length ? peaks : neutralPeaks} progress={duration ? time / duration : 0} duration={duration} time={time} onSeek={seek} />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-white/70"><span>{clock(time)}</span><span>{clock(duration)}</span></div>
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
      <button type="button" className={control} onClick={() => seek(time - 15)} aria-label="15 saniye geri"><RotateCcw size={15} />15</button>
      <button type="button" className={control} onClick={() => seek(time + 15)} aria-label="15 saniye ileri">15<RotateCw size={15} /></button>
      <button type="button" className={cn(control, "ml-auto min-w-16 tabular-nums")} onClick={cycleSpeed} aria-label={`Oynatma hızı ${speed}×. Değiştir.`}>{String(speed).replace(".", ",")}×</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-white">{error}</p>}
  </div>;
}

const control = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-white/20 px-3.5 text-sm text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Bars that fill as the recording plays; drag, tap or use the arrow keys to move through it. */
function Waveform({ peaks, progress, duration, time, onSeek }: { peaks: number[]; progress: number; duration: number; time: number; onSeek: (seconds: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [resized, setResized] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);

  // Only to redraw after a resize; the size itself is read from the element, so the first draw doesn't wait for the observer.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setResized(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d"), width = element?.clientWidth;
    if (!element || !context || !width) return;
    const height = element.clientHeight, ratio = window.devicePixelRatio || 1, bar = 3, gap = 2, count = Math.max(1, Math.floor((width + gap) / (bar + gap)));
    element.width = width * ratio;
    element.height = height * ratio;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < count; i++) {
      // Each bar shows the loudest stored value in its slice, so narrow screens keep the shape.
      const from = Math.floor((i / count) * peaks.length), to = Math.max(from + 1, Math.floor(((i + 1) / count) * peaks.length));
      let level = 0;
      for (let j = from; j < to; j++) level = Math.max(level, peaks[j] ?? 0);
      const barHeight = Math.max(3, (level / 100) * height), position = (i + 0.5) / count;
      context.fillStyle = position <= progress ? "#ffffff" : hover !== null && position <= hover ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)";
      context.beginPath();
      context.roundRect(i * (bar + gap), (height - barHeight) / 2, bar, barHeight, 1.5);
      context.fill();
    }
  }, [peaks, progress, hover, resized]);

  const ratioAt = (clientX: number) => { const rect = box.current!.getBoundingClientRect(); return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1); };
  return <div ref={box} role="slider" tabIndex={0} aria-label="Kayıtta ilerle" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} aria-valuetext={`${clock(time)} / ${clock(duration)}`}
    className="relative h-14 cursor-pointer touch-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-16"
    onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); onSeek(ratioAt(event.clientX) * duration); }}
    onPointerMove={event => { const ratio = ratioAt(event.clientX); if (dragging.current) onSeek(ratio * duration); else if (event.pointerType === "mouse") setHover(ratio); }}
    onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} onPointerLeave={() => setHover(null)}
    onKeyDown={event => {
      const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -30, PageUp: 30 }[event.key];
      if (step) { event.preventDefault(); onSeek(time + step); }
      else if (event.key === "Home") { event.preventDefault(); onSeek(0); }
      else if (event.key === "End") { event.preventDefault(); onSeek(duration); }
    }}>
    <canvas ref={canvas} className="size-full" aria-hidden />
    {hover !== null && <span className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-forest" style={{ left: `${hover * 100}%` }}>{clock(hover * duration)}</span>}
  </div>;
}
