"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LoaderCircle, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Plays the signed HLS stream in every browser and reports to Mux Data.
const MuxAudio = dynamic(() => import("@mux/mux-audio-react"), { ssr: false });

const clock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds)), hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, "0")}` : minutes}:${String(total % 60).padStart(2, "0")}`;
};
const speeds = [1, 1.25, 1.5, 2, 0.75];
// Drawn when a recording has no stored waveform.
const neutralPeaks = Array.from({ length: 96 }, (_, i) => Math.round(38 + 26 * Math.sin(i * 0.55) + 18 * Math.sin(i * 1.9 + 1)));

export type AudioPlayback = { playbackId: string; tokens: { playback: string } };
type Props = AudioPlayback & {
  title: string; duration: number; peaks?: number[] | null; startTime?: number;
  metadata?: { video_id: string; video_title: string; viewer_user_id?: string };
  /** A fresh playback after the token has expired; asked for once per failure. */
  refresh?: () => Promise<AudioPlayback | null>;
  onTime?: (seconds: number) => void; onEnded?: () => void;
};

/** Shared by the owner preview and student lessons so both look the same. */
export function LessonAudio({ playbackId, tokens, title, duration: knownDuration, peaks, startTime = 0, metadata, refresh, onTime, onEnded }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const element = () => holder.current?.querySelector("audio") ?? null;
  const resumeAt = useRef(startTime);
  const retried = useRef(false);
  const [renewed, setRenewed] = useState<AudioPlayback & { startTime: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [time, setTime] = useState(startTime);
  const [measured, setMeasured] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const source = renewed ?? { playbackId, tokens, startTime, play: false };
  const duration = measured ?? knownDuration;

  const seek = (seconds: number) => {
    const next = Math.min(Math.max(seconds, 0), duration);
    setTime(next);
    resumeAt.current = next;
    const audio = element();
    if (audio) audio.currentTime = next;
  };
  const toggle = () => {
    const audio = element();
    if (!audio) return;
    setError("");
    if (audio.paused) audio.play().catch(() => setError("Ses kaydı başlatılamadı. Bağlantınızı kontrol edip yeniden deneyin."));
    else audio.pause();
  };
  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    const audio = element();
    if (audio) audio.playbackRate = next;
  };
  // A token can expire mid-lesson: ask for a fresh one once, then continue where the listener was.
  const recover = async () => {
    const next = retried.current || !refresh ? null : await refresh().catch(() => null);
    retried.current = true;
    if (next) setRenewed({ ...next, startTime: resumeAt.current, play: playing });
    else { setPlaying(false); setWaiting(false); setError("Ses kaydı yüklenemedi. Dersi kapatıp yeniden açın."); }
  };

  return <div className="rounded-[22px] bg-forest p-5 text-white shadow-[0_18px_40px_-28px_rgba(34,76,64,0.9)] sm:p-7">
    <div ref={holder} className="hidden"><MuxAudio key={source.tokens.playback} playbackId={source.playbackId} tokens={source.tokens} startTime={source.startTime} streamType="on-demand" preload="metadata" metadata={metadata}
      onLoadedMetadata={event => { const audio = event.currentTarget; if (Number.isFinite(audio.duration) && audio.duration > 0) setMeasured(audio.duration); audio.playbackRate = speed; if (source.play) audio.play().catch(() => setPlaying(false)); }}
      // Whole seconds: the clock and the waveform need no finer, and most updates then re-render nothing.
      onTimeUpdate={event => { const seconds = event.currentTarget.currentTime; setTime(Math.floor(seconds)); resumeAt.current = seconds; retried.current = false; onTime?.(seconds); }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
      onEnded={() => { setPlaying(false); onEnded?.(); }} onError={() => void recover()} /></div>
    <div className="flex items-center gap-4 sm:gap-6">
      <button type="button" onClick={toggle} aria-label={playing ? `${title}: duraklat` : `${title}: oynat`} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-forest transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95 motion-reduce:transition-none sm:size-16">
        {waiting && playing ? <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" /> : playing ? <Pause className="size-6 fill-current" /> : <Play className="ml-1 size-6 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <Waveform peaks={peaks?.length ? peaks : neutralPeaks} duration={duration} time={time} onSeek={seek} />
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
const bar = 3, gap = 2;

function Waveform({ peaks, duration, time, onSeek }: { peaks: number[]; duration: number; time: number; onSeek: (seconds: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  // While dragging the bars follow the pointer; the recording is sought once, on release.
  const [scrub, setScrub] = useState<number | null>(null);
  const count = Math.max(1, Math.floor((width + gap) / (bar + gap)));
  const progress = scrub ?? (duration ? time / duration : 0);
  // Painting depends on bars, not pixels or seconds, so it runs only when a bar changes colour.
  const played = Math.round(progress * count), hovered = hover === null ? -1 : Math.round(hover * count);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!element || !context || !width) return;
    const height = element.clientHeight, ratio = window.devicePixelRatio || 1;
    element.width = width * ratio;
    element.height = height * ratio;
    context.scale(ratio, ratio);
    for (let i = 0; i < count; i++) {
      // Each bar shows the loudest stored value in its slice, so narrow screens keep the shape.
      const from = Math.floor((i / count) * peaks.length), to = Math.max(from + 1, Math.floor(((i + 1) / count) * peaks.length));
      const barHeight = Math.max(3, (Math.max(...peaks.slice(from, to)) / 100) * height);
      context.fillStyle = i < played ? "#ffffff" : i < hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)";
      context.beginPath();
      context.roundRect(i * (bar + gap), (height - barHeight) / 2, bar, barHeight, 1.5);
      context.fill();
    }
  }, [peaks, played, hovered, width, count]);

  const ratioAt = (clientX: number) => { const rect = box.current!.getBoundingClientRect(); return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1); };
  return <div ref={box} role="slider" tabIndex={0} aria-label="Kayıtta ilerle" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} aria-valuetext={`${clock(time)} / ${clock(duration)}`}
    className="relative h-14 cursor-pointer touch-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-16"
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setScrub(ratioAt(event.clientX)); }}
    onPointerMove={event => { const ratio = ratioAt(event.clientX); if (scrub !== null) setScrub(ratio); else if (event.pointerType === "mouse") setHover(ratio); }}
    onPointerUp={() => { if (scrub !== null) onSeek(scrub * duration); setScrub(null); }} onPointerCancel={() => setScrub(null)} onPointerLeave={() => setHover(null)}
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
