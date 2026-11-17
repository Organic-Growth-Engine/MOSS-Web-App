"use client"

/** Browser side of Google sign-in: OAuth 2.0 Authorization Code + PKCE via identity-service. */
import { identityService } from "@/lib/api/services/identity-service"
import { session } from "@/lib/api/session"
import type { TokenResponse } from "@/lib/api/types"

const KEY = "origin.oauth"

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

function random(length = 32) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return b64url(bytes)
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`

/** Only same-app relative paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/"
}

/** Builds the authorize URL and remembers the PKCE verifier for the callback. */
export async function googleAuthorizeUrl(next: string) {
  const verifier = random(48)
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))))
  const state = random(16)
  sessionStorage.setItem(KEY, JSON.stringify({ verifier, state, next: safeNext(next) }))
  return identityService.authorizeUrl({
    provider: "google",
    redirectUri: callbackUrl(),
    codeChallenge: challenge,
    state,
  })
}

/** Finishes the redirect: checks state, exchanges the code, stores the token. Returns `next`. */
export async function completeGoogleSignIn(code: string, state: string) {
  const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as
    | { verifier: string; state: string; next: string }
    | null
  sessionStorage.removeItem(KEY)
  if (!saved || saved.state !== state) throw new Error("This sign-in link has expired. Please try again.")
  const token = await identityService.exchangeToken({
    grantType: "authorization_code",
    code,
    codeVerifier: saved.verifier,
    redirectUri: callbackUrl(),
  })
  session.set(token)
  return saved.next
}

export function signedIn(token: TokenResponse) {
  session.set(token)
}

/** Restores an existing session without redirecting (public pages like /invite). */
export async function trySession() {
  if (session.token) return true
  try {
    session.set(await identityService.exchangeToken({ grantType: "refresh_token" }))
    return true
  } catch {
    return false
  }
}
