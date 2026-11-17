/**
 * Platform catalog — frontend constants by design (not served by the API).
 * `Platform` (the API enum) is the live subset of `PlatformId`.
 */
import type { DestinationFormat, MediaKind, Platform } from "@/lib/api/types"

export type PlatformId = Platform | "tiktok" | "pinterest" | "threads"

/** Platforms that can be connected and published to today. */
export type LivePlatformId = Platform

export const LIVE_PLATFORMS: LivePlatformId[] = ["instagram", "linkedin", "facebook", "x", "youtube"]
export const COMING_SOON_PLATFORMS: PlatformId[] = ["tiktok", "pinterest", "threads"]

export const platformMeta: Record<
  PlatformId,
  { name: string; charLimit?: number; comingSoon?: boolean; connectHint?: string }
> = {
  instagram: { name: "Instagram", charLimit: 2200, connectHint: "Business or Creator + Facebook Page" },
  linkedin: { name: "LinkedIn", charLimit: 3000, connectHint: "Company Page · Page admin required" },
  facebook: { name: "Facebook", charLimit: 63206, connectHint: "Official account authorization" },
  x: { name: "X", charLimit: 280, connectHint: "Official account authorization" },
  youtube: { name: "YouTube", charLimit: 5000, connectHint: "Official account authorization" },
  tiktok: { name: "TikTok", comingSoon: true },
  pinterest: { name: "Pinterest", comingSoon: true },
  threads: { name: "Threads", comingSoon: true },
}

/** The format a destination gets by default for the post's media. */
export function defaultFormat(platform: Platform, kind: MediaKind | null): DestinationFormat {
  if (kind !== "video") return platform === "youtube" ? "short" : "post"
  const video: Record<Platform, DestinationFormat> = {
    instagram: "reel",
    facebook: "reel",
    linkedin: "native_video",
    x: "video_post",
    youtube: "short",
  }
  return video[platform]
}
