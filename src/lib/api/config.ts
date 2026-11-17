/**
 * API configuration from NEXT_PUBLIC_* env vars (see .env.example).
 *
 * Next.js inlines NEXT_PUBLIC_* only when referenced literally, so every variable is spelled
 * out below — don't refactor this into a dynamic `process.env[name]` lookup.
 */

export type ServiceName =
  | "identity"
  | "workspace"
  | "accounts"
  | "content"
  | "media"
  | "analytics"
  | "notifications"
  | "search"

/** Unset → true, so a fresh checkout runs entirely on mock data. */
function flag(value: string | undefined, fallback = true) {
  if (value === undefined || value === "") return fallback
  return value === "true" || value === "1"
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, "")
}

const gateway = trimSlash(process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1")

export const apiConfig = {
  /** API gateway base URL. Every service is reachable through it. */
  baseUrl: gateway,
  timeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 15_000,
  /** Simulated network latency for mock services, in ms. */
  mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 120),
  /**
   * Fixed "now" (ISO date-time) used for relative dates. Defaults to the moment the mock data
   * describes while content is mocked, and to the real clock otherwise.
   */
  demoNow: process.env.NEXT_PUBLIC_DEMO_NOW || undefined,

  useMock: {
    identity: flag(process.env.NEXT_PUBLIC_USE_MOCK_IDENTITY),
    workspace: flag(process.env.NEXT_PUBLIC_USE_MOCK_WORKSPACE),
    accounts: flag(process.env.NEXT_PUBLIC_USE_MOCK_ACCOUNTS),
    content: flag(process.env.NEXT_PUBLIC_USE_MOCK_CONTENT),
    media: flag(process.env.NEXT_PUBLIC_USE_MOCK_MEDIA),
    analytics: flag(process.env.NEXT_PUBLIC_USE_MOCK_ANALYTICS),
    notifications: flag(process.env.NEXT_PUBLIC_USE_MOCK_NOTIFICATIONS),
    search: flag(process.env.NEXT_PUBLIC_USE_MOCK_SEARCH),
  } satisfies Record<ServiceName, boolean>,

  /** Optional per-service base URL, for talking to a service directly instead of via the gateway. */
  serviceUrl: {
    identity: process.env.NEXT_PUBLIC_IDENTITY_API_URL,
    workspace: process.env.NEXT_PUBLIC_WORKSPACE_API_URL,
    accounts: process.env.NEXT_PUBLIC_ACCOUNTS_API_URL,
    content: process.env.NEXT_PUBLIC_CONTENT_API_URL,
    media: process.env.NEXT_PUBLIC_MEDIA_API_URL,
    analytics: process.env.NEXT_PUBLIC_ANALYTICS_API_URL,
    notifications: process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL,
    search: process.env.NEXT_PUBLIC_SEARCH_API_URL,
  } satisfies Record<ServiceName, string | undefined>,
} as const

export function baseUrlFor(service: ServiceName) {
  const override = apiConfig.serviceUrl[service]
  return override ? trimSlash(override) : apiConfig.baseUrl
}
