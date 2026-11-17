/**
 * Access-token holder. The access token lives in memory only; the refresh token is an
 * httpOnly cookie set by identity-service, so a page reload refreshes the session through
 * POST /auth/token { grantType: "refresh_token" }.
 */
import type { TokenResponse } from "@/lib/api/types"

type Listener = (token: string | null) => void

let accessToken: string | null = null
const listeners = new Set<Listener>()

export const session = {
  get token() {
    return accessToken
  },
  set(response: TokenResponse | null) {
    accessToken = response?.accessToken ?? null
    listeners.forEach((l) => l(accessToken))
  },
  clear() {
    session.set(null)
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Workspace roles carried in the access token's `workspaces` claim. */
export function tokenRoles(token = accessToken): Record<string, string> {
  if (!token) return {}
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return payload.workspaces ?? {}
  } catch {
    return {}
  }
}
