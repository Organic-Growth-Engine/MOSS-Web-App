"use client"

import { useState } from "react"

import { errorMessage, isApiError } from "@/lib/api/errors"
import { googleAuthorizeUrl } from "@/lib/auth/sign-in"
import { useFollowUrl } from "@/lib/navigation"
import { Logo } from "@/components/shared/logo"
import { Panel } from "@/components/shared/panel"
import { Callout } from "@/components/shared/callout"
import { Button } from "@/components/ui/button"

/** Centered card used by every signed-out page. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo href={null} />
      <Panel className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </Panel>
      {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
    </main>
  )
}

export function Field({
  label,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
      />
      {error ? (
        <span className="mt-1 block font-normal text-destructive">{error}</span>
      ) : (
        hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>
      )}
    </label>
  )
}

export function FormError({ error, title }: { error: unknown; title: string }) {
  if (!error) return null
  // Field-level problems are shown next to their inputs.
  if (isApiError(error, "VALIDATION_FAILED") && error.details.length) return null
  return (
    <Callout tone="danger" role="alert" title={title}>
      {errorMessage(error)}
    </Callout>
  )
}

export const fieldError = (error: unknown, field: string) =>
  isApiError(error) ? error.fieldError(field) : undefined

export function GoogleButton({ next, label = "Continue with Google" }: { next: string; label?: string }) {
  const followUrl = useFollowUrl()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        followUrl(await googleAuthorizeUrl(next))
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-4">
        <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
      </svg>
      {busy ? "Redirecting…" : label}
    </Button>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  )
}
