import { apiConfig } from "@/lib/api/config"
import { FIXTURE_NOW } from "@/lib/api/mocks/fixtures"

/**
 * "Now" for the UI. While content is mocked, the app pins to the moment the fixtures describe
 * (Mon, Mar 23 2026) so relative labels like "Tomorrow" and "Edited 1h ago" read correctly.
 * Set NEXT_PUBLIC_DEMO_NOW to override, or turn the content mock off to use the real clock.
 */
const pinned = apiConfig.demoNow ?? (apiConfig.useMock.content ? FIXTURE_NOW : undefined)

export function now(): Date {
  return pinned ? new Date(pinned) : new Date()
}
