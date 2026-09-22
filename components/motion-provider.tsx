"use client";
import { LazyMotion, domAnimation } from "motion/react";

// Components use `m.*` from motion/react-m; only the domAnimation feature set ships (no layout or drag).
// `strict` throws if a full `motion.*` component slips in and undoes the saving.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation} strict>{children}</LazyMotion>;
}
