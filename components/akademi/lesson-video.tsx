"use client";
import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import type Player from "@mux/mux-player-react";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false, loading: () => <div className="aspect-video animate-pulse rounded-2xl bg-forest/10" /> });

/** Mux Player with academy defaults; the owner preview and student lessons must look the same. */
export function LessonVideo(props: ComponentProps<typeof Player>) {
  return <MuxPlayer className="aspect-video overflow-hidden rounded-2xl" streamType="on-demand" accentColor="#489b9e" defaultHiddenCaptions {...props} />;
}
