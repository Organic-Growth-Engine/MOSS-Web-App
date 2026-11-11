import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Tone } from "@/components/shared/status-pill"

const styles: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
}

const defaultIcons: Record<Tone, LucideIcon> = {
  neutral: Info,
  primary: CircleAlert,
  success: CircleCheck,
  warning: CircleAlert,
  danger: CircleAlert,
  info: Info,
}

/**
 * Tinted message box: page banners ("LinkedIn authorization expired"),
 * inline notes ("Good to know"), and form errors ("We couldn't log you in").
 */
export function Callout({
  tone = "primary",
  title,
  icon,
  action,
  className,
  children,
  role,
}: {
  tone?: Tone
  title?: React.ReactNode
  icon?: LucideIcon | null
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
  role?: "alert" | "status"
}) {
  const Icon = icon === null ? null : (icon ?? defaultIcons[tone])
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col gap-3 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
        styles[tone],
        className
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {Icon && <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />}
        <div className="min-w-0 space-y-1 text-sm">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className="leading-relaxed opacity-90">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
    </div>
  )
}
