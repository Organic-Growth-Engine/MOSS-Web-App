import { cn } from "@/lib/utils"

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info"

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
}

/**
 * Small status label. `dot` adds the leading bullet used on Posts/Calendar
 * ("• Scheduled"); without it, it's the plain tag used on Accounts ("Connected").
 */
export function StatusPill({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
