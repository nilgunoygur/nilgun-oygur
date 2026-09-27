"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { Check, ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The article image library, shared by the cover picker and the editor's image dialog.

export type ImageChoice = { url: string; name: string };
export type UploadImage = (file: File) => Promise<ImageChoice | null>;
export const imageRules = "JPG, PNG veya WebP; en fazla 1,5 MB.";

export function ImageLibrary({ images, selected, onSelect, label, className }: { images: ImageChoice[]; selected: string | null; onSelect: (choice: ImageChoice) => void; label: string; className?: string }) {
  return <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
    {images.map(choice => <button type="button" role="radio" aria-checked={selected === choice.url} key={choice.url} onClick={() => onSelect(choice)} className={cn("relative overflow-hidden rounded-xl border-2 bg-muted text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", selected === choice.url ? "border-primary" : "border-transparent hover:border-primary/50")}>
      <span className="relative block aspect-[4/3]"><Image src={choice.url} alt="" fill sizes="(max-width: 640px) 45vw, 220px" className="object-cover" unoptimized={choice.url.startsWith("/api/")} /></span>
      <span className="block truncate px-3 py-2 text-xs font-medium" title={choice.name}>{choice.name}</span>
      {selected === choice.url && <span className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground"><Check className="size-3" /></span>}
    </button>)}
  </div>;
}

export function ImageUploadButton({ upload, onUploaded, children, label }: { upload: UploadImage; onUploaded: (choice: ImageChoice) => void; children: React.ReactNode; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startUpload] = useTransition();
  return <>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={label} onChange={event => {
      const input = event.currentTarget, file = input.files?.[0];
      if (file) startUpload(async () => { const choice = await upload(file); if (choice) onUploaded(choice); input.value = ""; });
    }} />
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>{pending ? <LoaderCircle className="animate-spin" /> : <ImagePlus />} {children}</Button>
  </>;
}
