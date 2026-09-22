"use client";
import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

export function PromoVideo() {
  const [playing, setPlaying] = useState(false);
  return <div className="aspect-[16/10] overflow-hidden rounded-[24px] bg-[#19392f] shadow-[0_15px_45px_#19392f15]">
    {playing ? <video className="size-full object-contain" src="/videos/academy-preview-v1.mp4" controls autoPlay playsInline preload="metadata" aria-label="Akademi tanıtımı için örnek video" /> :
      <button className="relative block size-full text-left after:absolute after:inset-0 after:bg-[linear-gradient(transparent_40%,#122b24dc)] after:content-['']" onClick={() => setPlaying(true)} aria-label="Örnek tanıtım videosunu oynat">
        <Image src="/images/akademi/academy-art-v1.png" alt="" fill sizes="(max-width:760px) 90vw, 680px" />
        <span className="absolute top-1/2 left-1/2 z-1 grid size-[78px] -translate-1/2 place-items-center rounded-full bg-[#f0f5d9] text-forest shadow-[0_0_0_12px_#ffffff35]"><Play fill="currentColor" aria-hidden="true" /></span>
        <span className="absolute bottom-[25px] left-7 z-1 text-[25px] text-white max-tablet:bottom-5 max-tablet:left-5 max-tablet:text-[21px]">Akademi ile tanışın <small className="mt-[5px] block text-[12px]">Tanıtım önizlemesi · Örnek video</small></span>
      </button>}
  </div>;
}
