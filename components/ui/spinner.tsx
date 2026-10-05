import type { CSSProperties } from "react"
import { cn } from "cn"
import { Orb } from "./orb"

/** Takes the surrounding text colour. Without a label it is decoration beside text that already says what is loading. */
function Spinner({ size = 20, className, "aria-label": label }: { size?: number; className?: string; "aria-label"?: string }) {
  return <span data-slot="spinner" role={label ? "status" : undefined} aria-hidden={label ? undefined : true} className={cn("inline-flex shrink-0", className)}><Orb variant="S3" size={size} label={label} style={{ "--orb-fg": "currentColor" } as CSSProperties} /></span>
}

function PageLoader({ label }: { label: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-forest"><Spinner size={64} aria-label={label} /></div>
}

export { PageLoader, Spinner }
