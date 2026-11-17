/**
 * The one HTTP client every real service module uses.
 * - base URL per service (gateway by default, see config.ts)
 * - Bearer token injection + a single silent refresh on 401
 * - timeout, JSON / blob handling, and ApiError normalization
 */
import { apiConfig, baseUrlFor, type ServiceName } from "@/lib/api/config"
import { ApiError } from "@/lib/api/errors"
import { session } from "@/lib/api/session"
import type { TokenResponse } from "@/lib/api/types"

type QueryValue = string | number | boolean | string[] | null | undefined
export type Query = Record<string, QueryValue>

export type RequestOptions = {
  query?: Query
  body?: unknown
  signal?: AbortSignal
  /** Public endpoints (sign-in, sign-up, invitation preview) skip the Authorization header. */
  auth?: boolean
  responseType?: "json" | "blob" | "none"
}

/** Called when the session can't be refreshed; the auth guard redirects to /login. */
const unauthenticatedListeners = new Set<() => void>()
export function onUnauthenticated(listener: () => void) {
  unauthenticatedListeners.add(listener)
  return () => {
    unauthenticatedListeners.delete(listener)
  }
}

function buildUrl(service: ServiceName, path: string, query?: Query) {
  const url = `${baseUrlFor(service)}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","))
    } else params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/** Encodes path params: path`/workspaces/${id}/posts`. */
export function path(strings: TemplateStringsArray, ...values: (string | number)[]) {
  return strings.reduce(
    (out, s, i) => out + s + (i < values.length ? encodeURIComponent(String(values[i])) : ""),
    ""
  )
}

let refreshing: Promise<boolean> | null = null

/** Single-flight refresh using the httpOnly refresh cookie. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const token = await send<TokenResponse>("identity", "POST", "/auth/token", {
        body: { grantType: "refresh_token" },
        auth: false,
      })
      session.set(token)
      return true
    } catch {
      session.clear()
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send<T>(
  service: ServiceName,
  method: string,
  pathname: string,
  options: RequestOptions = {}
): Promise<T> {
  const { query, body, signal, auth = true, responseType = "json" } = options
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), apiConfig.timeoutMs)
  const onAbort = () => timeout.abort()
  signal?.addEventListener("abort", onAbort)

  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`

  let response: Response
  try {
    response = await fetch(buildUrl(service, pathname, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      signal: timeout.signal,
    })
  } catch (cause) {
    if (signal?.aborted) throw cause
    throw new ApiError(
      timeout.signal.aborted
        ? { status: 0, code: "TIMEOUT", message: "The request took too long. Please try again." }
        : { status: 0, code: "NETWORK_ERROR", message: "Can't reach Origin. Check your connection." }
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", onAbort)
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    throw ApiError.fromResponse(response.status, payload)
  }
  if (responseType === "none" || response.status === 204) return undefined as T
  if (responseType === "blob") return (await response.blob()) as T
  return (await response.json()) as T
}

export async function request<T>(
  service: ServiceName,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  pathname: string,
  options: RequestOptions = {}
): Promise<T> {
  try {
    return await send<T>(service, method, pathname, options)
  } catch (error) {
    const retryable =
      error instanceof ApiError && error.status === 401 && options.auth !== false
    if (!retryable) throw error
    if (await refreshSession()) return send<T>(service, method, pathname, options)
    unauthenticatedListeners.forEach((l) => l())
    throw error
  }
}

export const http = {
  get: <T>(s: ServiceName, p: string, o?: RequestOptions) => request<T>(s, "GET", p, o),
  post: <T>(s: ServiceName, p: string, o?: RequestOptions) => request<T>(s, "POST", p, o),
  patch: <T>(s: ServiceName, p: string, o?: RequestOptions) => request<T>(s, "PATCH", p, o),
  put: <T>(s: ServiceName, p: string, o?: RequestOptions) => request<T>(s, "PUT", p, o),
  delete: <T>(s: ServiceName, p: string, o?: RequestOptions) => request<T>(s, "DELETE", p, o),
}
