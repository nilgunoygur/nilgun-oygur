"use client";
import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

export function IntroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useInView(ref, { amount: 0.3 });
  const reduced = useReducedMotion();
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (visible && reduced === false) {
      void video.play().catch(() => {
        /* Native controls remain available if autoplay is blocked. */
      });
    } else {
      video.pause();
    }
  }, [visible, reduced]);
  return (
    <video
      ref={ref}
      className="process-video"
      src="/videos/journey.mp4"
      controls
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Nilgün Oygur ile dönüşüm yolculuğu"
    />
  );
}
