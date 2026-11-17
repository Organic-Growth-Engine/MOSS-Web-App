"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"

import { onUnauthenticated } from "@/lib/api/http"
import { session } from "@/lib/api/session"
import { identityService } from "@/lib/api/services/identity-service"
import { LoadingBlock } from "@/components/shared/query-state"
import { WorkspaceGate } from "@/components/auth/workspace-gate"

/**
 * Restores the session on load (refresh-cookie → access token) and sends signed-out users to
 * /login. Page content renders only once a session exists, so pages can assume auth.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Read the token straight from the session store: with Cache Components a previously visited
  // layout is kept alive and revealed again, so local "ready" state could be stale.
  const ready = useSyncExternalStore(session.subscribe, () => Boolean(session.token), () => false)

  useEffect(() => {
    const toLogin = () => router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    const stop = onUnauthenticated(toLogin)
    if (!session.token) {
      identityService
        .exchangeToken({ grantType: "refresh_token" })
        .then((token) => session.set(token))
        .catch(toLogin)
    }
    return stop
  }, [router])

  if (!ready) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <LoadingBlock className="h-16 max-w-md" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <LoadingBlock key={i} className="h-28" />
          ))}
        </div>
        <LoadingBlock className="h-72" />
      </div>
    )
  }
  return <WorkspaceGate>{children}</WorkspaceGate>
}
