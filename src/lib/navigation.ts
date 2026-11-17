"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Follows a URL returned by the API (OAuth authorization, Stripe checkout/portal).
 * Same-origin URLs — what the mocks return — use client navigation so in-memory mock state
 * survives; external URLs do a full page navigation.
 */
export function useFollowUrl() {
  const router = useRouter()
  return useCallback(
    (url: string) => {
      const target = new URL(url, window.location.href)
      if (target.origin === window.location.origin) router.push(`${target.pathname}${target.search}`)
      else window.location.assign(target.toString())
    },
    [router]
  )
}

export const appUrl = (pathname: string) => `${window.location.origin}${pathname}`

/** Saves a Blob (CSV/PDF export) as a file. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
