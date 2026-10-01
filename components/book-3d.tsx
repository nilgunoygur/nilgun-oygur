"use client";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A paperback built from six CSS-3D faces. The covers are ordinary images and the spine is real text,
// so everything stays sharp at any size and is on the page before any script runs.

const rest = { x: -8, y: 32 };
const radians = (degrees: number) => (degrees * Math.PI) / 180;
// Light from the upper right, in front of the book (CSS axes: x right, y down, z towards the viewer),
// so the cover the book rests on is lit and its spine falls into shade.
const light = [0.35, -0.35, 0.87];

/** How dark a face is once the book is turned: 0 facing the light, up to 0.3 turned away. */
function shadeOf([x, y, z]: number[], rotation: typeof rest) {
  const a = radians(rotation.x), b = radians(rotation.y);
  const turnedX = x * Math.cos(b) + z * Math.sin(b), turnedZ = -x * Math.sin(b) + z * Math.cos(b);
  const normal = [turnedX, y * Math.cos(a) - turnedZ * Math.sin(a), y * Math.sin(a) + turnedZ * Math.cos(a)];
  return 0.3 * (1 - Math.max(0, normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]));
}

const face = "absolute overflow-hidden [backface-visibility:hidden]";
const cover = cn(face, "top-0 left-0 h-(--h) w-(--w) bg-white");
const edge = cn(face, "top-0 left-[calc((var(--w)-var(--t))/2)] h-(--h) w-(--t)");
const cap = cn(face, "top-[calc((var(--h)-var(--t))/2)] left-0 h-(--t) w-(--w) bg-[repeating-linear-gradient(0deg,#f6f1e6_0_1px,#e3dccb_1px_2px)]");
const half = "calc(var(--t) / 2)";

function Face({ className, transform, normal, rotation, children }: { className: string; transform: string; normal: number[]; rotation: typeof rest; children?: ReactNode }) {
  return <div className={className} style={{ transform }}>
    {children}
    <span aria-hidden className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-700 ease-out motion-reduce:transition-none" style={{ opacity: shadeOf(normal, rotation) }} />
  </div>;
}

export function Book3D({ front, back, alt, spine, children, className }: {
  /** Front cover image. */
  front: string;
  /** Back cover image; without one, `children` is typeset as the back cover. */
  back?: string;
  alt: string;
  spine: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [rotation, setRotation] = useState(rest);
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0 });
  const turn = (degrees: number) => setRotation(current => ({ ...current, y: current.y + degrees }));

  return <div className={cn("[--h:400px] [--t:calc(var(--h)*11/225)] [--w:calc(var(--h)*155/225)] max-tablet:[--h:320px]", className)}>
    <div role="group" tabIndex={0} aria-label={`${alt}. Çevirmek için sürükleyin veya ok tuşlarını kullanın.`}
      className={cn("relative touch-pan-y rounded-lg outline-none select-none [perspective:1400px] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white", dragging ? "cursor-grabbing" : "cursor-grab")}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); last.current = { x: event.clientX, y: event.clientY }; setDragging(true); }}
      onPointerMove={event => {
        if (!dragging) return;
        const dx = event.clientX - last.current.x, dy = event.clientY - last.current.y;
        last.current = { x: event.clientX, y: event.clientY };
        setRotation(current => ({ x: Math.min(Math.max(current.x - dy * 0.4, -35), 35), y: current.y + dx * 0.6 }));
      }}
      onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
      onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); turn(event.key === "ArrowLeft" ? -20 : 20); } }}>
      <div className={cn("relative h-(--h) w-(--w) [transform-style:preserve-3d]", !dragging && "transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none")}
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
        <Face className={cover} transform={`translateZ(${half})`} normal={[0, 0, 1]} rotation={rotation}>
          <img src={front} alt={alt} draggable={false} fetchPriority="high" className="size-full object-cover" />
          {/* The crease a paperback gets beside its spine. */}
          <span aria-hidden className="absolute inset-y-0 left-[3%] w-px bg-black/10 shadow-[1px_0_2px_rgba(255,255,255,0.6)]" />
        </Face>
        <Face className={cover} transform={`rotateY(180deg) translateZ(${half})`} normal={[0, 0, -1]} rotation={rotation}>
          {back ? <img src={back} alt="Arka kapak" draggable={false} loading="lazy" className="size-full object-cover" /> : children}
        </Face>
        <Face className={cn(edge, "bg-white")} transform="rotateY(-90deg) translateZ(calc(var(--w) / 2))" normal={[-1, 0, 0]} rotation={rotation}>{spine}</Face>
        <Face className={cn(edge, "bg-[repeating-linear-gradient(90deg,#f6f1e6_0_1px,#e3dccb_1px_2px)]")} transform="rotateY(90deg) translateZ(calc(var(--w) / 2))" normal={[1, 0, 0]} rotation={rotation} />
        <Face className={cap} transform="rotateX(90deg) translateZ(calc(var(--h) / 2))" normal={[0, -1, 0]} rotation={rotation} />
        <Face className={cap} transform="rotateX(-90deg) translateZ(calc(var(--h) / 2))" normal={[0, 1, 0]} rotation={rotation} />
      </div>
      <span aria-hidden className="pointer-events-none absolute -bottom-9 left-1/2 h-7 w-[120%] -translate-x-1/2 rounded-[50%] bg-[#163c40]/35 blur-xl" />
    </div>
  </div>;
}

/** A spine's text: a strip as long as the book is tall, laid along the spine so it reads from top to bottom. */
export function SpineText({ start, title, end }: { start: ReactNode; title: ReactNode; end: ReactNode }) {
  return <span className="absolute top-1/2 left-1/2 grid h-(--t) w-(--h) -translate-1/2 rotate-90 grid-cols-[1fr_auto_1fr] items-center leading-none whitespace-nowrap" style={{ paddingInline: "calc(var(--h) * 0.06)" }}>
    <span>{start}</span>{title}<span className="text-right">{end}</span>
  </span>;
}
