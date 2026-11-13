import { cn } from "@/lib/utils"

/** Lavender circle with initials ("SN", "MC") — the only avatar style in the design. */
export function InitialsAvatar({
  initials,
  size = "md",
  className,
  label,
}: {
  initials: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  label?: string
}) {
  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-[11px]",
    md: "size-10 text-xs",
    lg: "size-12 text-sm",
    xl: "size-14 text-sm",
  }
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary",
        sizes[size],
        className
      )}
    >
      <span aria-hidden={label ? true : undefined}>{initials}</span>
    </span>
  )
}

export function AvatarStack({ people, className }: { people: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {people.map((p) => (
        <InitialsAvatar key={p} initials={p} size="xs" />
      ))}
    </span>
  )
}
