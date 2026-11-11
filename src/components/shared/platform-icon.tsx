import { cn } from "@/lib/utils"
import type { PlatformId } from "@/lib/data/types"

type IconProps = { className?: string; strokeWidth?: number }

const paths: Record<PlatformId, (p: { sw: number }) => React.ReactNode> = {
  instagram: ({ sw }) => (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" strokeWidth={sw} />
      <circle cx="12" cy="12" r="3.75" strokeWidth={sw} />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: ({ sw }) => (
    <>
      <circle cx="5.5" cy="5.25" r="1.4" fill="currentColor" stroke="none" />
      <path d="M5.5 9.5V20" strokeWidth={sw + 0.5} />
      <path d="M10.5 20v-10.5M10.5 14a4 4 0 0 1 8 0v6" strokeWidth={sw + 0.5} />
    </>
  ),
  facebook: ({ sw }) => (
    <path
      d="M15.5 3.5h-2.25A3.75 3.75 0 0 0 9.5 7.25V20.5M6 11h3.5M13 11h3M9.5 14.5H13"
      strokeWidth={sw + 0.25}
    />
  ),
  x: ({ sw }) => (
    <>
      <path d="M4.5 4h4.25L19.5 20h-4.25z" strokeWidth={sw} />
      <path d="M19 4l-6.4 7M5 20l6.4-7" strokeWidth={sw} />
    </>
  ),
  youtube: ({ sw }) => (
    <>
      <rect x="2.75" y="5.5" width="18.5" height="13" rx="4" strokeWidth={sw} />
      <path d="M10.25 9.5v5l4.25-2.5z" fill="currentColor" strokeWidth={sw * 0.6} />
    </>
  ),
  tiktok: ({ sw }) => (
    <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.4 2.3 4 5 4" strokeWidth={sw} />
  ),
  pinterest: ({ sw }) => (
    <>
      <path d="M6 5h12M8 5v.5c0 2 1.5 3 4 3s4-1 4-3V5" strokeWidth={sw} />
      <path d="M12 8.5 10 20" strokeWidth={sw} />
    </>
  ),
  threads: ({ sw }) => (
    <>
      <circle cx="12" cy="12" r="3.25" strokeWidth={sw} />
      <path d="M15.25 12v1.25a2.4 2.4 0 0 0 4.75 0V12a8 8 0 1 0-3.2 6.4" strokeWidth={sw} />
    </>
  ),
}

export const platformMeta: Record<
  PlatformId,
  { name: string; charLimit?: number; comingSoon?: boolean }
> = {
  instagram: { name: "Instagram", charLimit: 2200 },
  linkedin: { name: "LinkedIn", charLimit: 3000 },
  facebook: { name: "Facebook", charLimit: 63206 },
  x: { name: "X", charLimit: 280 },
  youtube: { name: "YouTube", charLimit: 5000 },
  tiktok: { name: "TikTok", comingSoon: true },
  pinterest: { name: "Pinterest", comingSoon: true },
  threads: { name: "Threads", comingSoon: true },
}

/** Line-style platform glyph that inherits text color. */
export function PlatformIcon({
  platform,
  className,
  strokeWidth = 1.75,
  title,
}: IconProps & { platform: PlatformId; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {paths[platform]({ sw: strokeWidth })}
    </svg>
  )
}

/** Platform glyph inside a soft rounded square, as used on cards and table rows. */
export function PlatformTile({
  platform,
  size = "md",
  className,
}: {
  platform: PlatformId
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const box = { sm: "size-7 rounded-md", md: "size-10 rounded-lg", lg: "size-12 rounded-xl" }[size]
  const icon = { sm: "size-4", md: "size-5", lg: "size-6" }[size]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-muted text-foreground",
        box,
        className
      )}
    >
      <PlatformIcon platform={platform} className={icon} title={platformMeta[platform].name} />
    </span>
  )
}

/** A compact row of platform glyphs (posts list, calendar, etc.). */
export function PlatformRow({
  platforms,
  max,
  className,
  iconClassName,
}: {
  platforms: PlatformId[]
  max?: number
  className?: string
  iconClassName?: string
}) {
  const shown = max ? platforms.slice(0, max) : platforms
  const rest = platforms.length - shown.length
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {shown.map((p) => (
        <span
          key={p}
          className="inline-flex size-6 items-center justify-center rounded-md bg-muted"
        >
          <PlatformIcon
            platform={p}
            className={cn("size-3.5", iconClassName)}
            title={platformMeta[p].name}
          />
        </span>
      ))}
      {rest > 0 && <span className="text-xs text-primary">+{rest}</span>}
    </span>
  )
}
