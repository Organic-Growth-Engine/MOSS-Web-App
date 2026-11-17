"use client"

import { RotateCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { errorMessage } from "@/lib/api/errors"
import { Callout } from "@/components/shared/callout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder lines/blocks while data loads; sized by the caller to match the real content. */
export function LoadingBlock({ className, lines = 0 }: { className?: string; lines?: number }) {
  if (!lines) return <Skeleton aria-hidden className={cn("h-24 w-full rounded-xl", className)} />
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  )
}

/** Inline failure message with a retry, in the same tinted style as other callouts. */
export function ErrorState({
  error,
  onRetry,
  title = "We couldn't load this",
  className,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}) {
  return (
    <Callout
      tone="danger"
      role="alert"
      title={title}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden /> Try again
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Callout>
  )
}

const noticeTone = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  danger: "border-destructive/20 bg-destructive-soft text-destructive",
} as const

/** The status strip pages already used for action feedback ("Draft saved…"). */
export function Notice({ tone = "info", children }: { tone?: keyof typeof noticeTone; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div role="status" className={cn("rounded-lg border px-4 py-3 text-sm", noticeTone[tone])}>
      {children}
    </div>
  )
}

export type NoticeState = { tone: keyof typeof noticeTone; text: string } | null
