import { cn } from "@/lib/utils"

/** White bordered card used for every section in the design (rounded-xl, 1px border). */
export function Panel({
  className,
  as: Comp = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Comp
      className={cn("rounded-xl border bg-card p-5 text-card-foreground sm:p-6", className)}
      {...props}
    />
  )
}

export function PanelTitle({
  className,
  as: Comp = "h2",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" }) {
  return <Comp className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
}

/** Uppercase table/section label ("WHAT YOU'LL AUTHORIZE", "PLATFORM"). */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] font-medium tracking-wider text-muted-foreground uppercase", className)}
      {...props}
    />
  )
}
