import { Play } from "lucide-react"

import { cn } from "@/lib/utils"

/** Small dark "▶ 0:24" chip shown on video thumbnails. */
export function DurationBadge({ duration, className }: { duration: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-neutral-800/90 px-1.5 py-0.5 text-[11px] font-medium text-white",
        className
      )}
    >
      <Play aria-hidden className="size-2.5 fill-current" />
      {duration}
    </span>
  )
}

/**
 * Media thumbnail placeholder. The design's artwork isn't in the exports, so this
 * renders a soft tinted block; pass `src` once real media is available.
 */
export function MediaThumb({
  src,
  alt = "",
  duration,
  dark = false,
  className,
}: {
  src?: string
  alt?: string
  duration?: string
  dark?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        dark ? "bg-neutral-900" : "bg-gradient-to-br from-muted to-primary-soft/60",
        className
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      )}
      {duration && <DurationBadge duration={duration} className="absolute right-2 bottom-2" />}
    </div>
  )
}
