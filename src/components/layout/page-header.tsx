import { cn } from "@/lib/utils"

/** Large page title + friendly subtitle, with optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">
          {title}
        </h1>
        {description && <p className="text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center",
        className
      )}
    >
      {icon && <div className="mb-2 text-muted-foreground">{icon}</div>}
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
