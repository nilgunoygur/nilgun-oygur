"use client";
import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

export function PromoVideo() {
  const [playing, setPlaying] = useState(false);
  return <div className="academy-film">
    {playing ? <video src="/videos/academy-preview-v1.mp4" controls autoPlay playsInline preload="metadata" aria-label="Akademi tanıtımı için örnek video" /> :
      <button className="academy-film-trigger" onClick={() => setPlaying(true)} aria-label="Örnek tanıtım videosunu oynat">
        <Image src="/images/akademi/academy-art-v1.png" alt="" fill sizes="(max-width:760px) 90vw, 680px" />
        <span className="academy-film-play"><Play fill="currentColor" aria-hidden="true" /></span>
        <span className="academy-film-caption">Akademi ile tanışın <small>Tanıtım önizlemesi · Örnek video</small></span>
      </button>}
  </div>;
}
