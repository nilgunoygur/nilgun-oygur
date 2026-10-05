import type { CSSProperties } from "react"
import { cn } from "cn"
import { Orb } from "./orb"

/** The app's one loading indicator; it takes the surrounding text colour. */
function Spinner({ size = 20, className, "aria-label": label = "Yükleniyor" }: { size?: number; className?: string; "aria-label"?: string }) {
  return <span data-slot="spinner" role="status" className={cn("inline-flex shrink-0", className)}><Orb variant="S3" size={size} label={label} style={{ "--orb-fg": "currentColor" } as CSSProperties} /></span>
}

/** Centred in the page while a route's content loads. */
function PageLoader({ label }: { label: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-forest"><Spinner size={64} aria-label={label} /></div>
}

export { PageLoader, Spinner }
