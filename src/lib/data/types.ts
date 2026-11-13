export type PlatformId =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "x"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "threads"

/** Platforms that can be connected and published to today. */
export type LivePlatformId = Exclude<PlatformId, "tiktok" | "pinterest" | "threads">

export const LIVE_PLATFORMS: LivePlatformId[] = ["instagram", "linkedin", "facebook", "x", "youtube"]
export const COMING_SOON_PLATFORMS: PlatformId[] = ["tiktok", "pinterest", "threads"]

export type Member = {
  id: string
  name: string
  initials: string
  email: string
  role: "Owner" | "Admin" | "Editor"
}

export type Workspace = {
  id: string
  name: string
  initials: string
  kind: string
  slug: string
  timezone: string
  timezoneLabel: string
  plan: { name: string; accountSlots: number; seats: number }
}

export type AccountStatus = "connected" | "expired" | "expires_soon" | "not_connected"

export type SocialAccount = {
  id: string
  platform: LivePlatformId
  handle: string
  displayName: string
  accountType: string
  audience: number
  audienceLabel: "followers" | "subscribers"
  status: AccountStatus
  isDefault: boolean
  connectedBy?: string
  connectedOn?: string
  permissions: string[]
}

export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "publishing"

export type DestinationStatus = "published" | "failed" | "publishing" | "queued" | "scheduled"

export type Destination = {
  platform: LivePlatformId
  accountLabel: string
  format: string
  status: DestinationStatus
  at?: string
  error?: { title: string; detail: string }
}

export type Post = {
  id: string
  title: string
  mediaType: "Video" | "Image"
  duration?: string
  campaign: string
  status: PostStatus
  publishAt?: string
  editedLabel?: string
  createdBy: string
  destinations: Destination[]
  caption: string
}

export type MediaAsset = {
  id: string
  name: string
  type: "MP4" | "JPG" | "PNG"
  size: string
  duration?: string
  dimensions: string
  addedOn: string
  folder: string
  usage?: string
}

export type CalendarEntry = {
  id: string
  date: string // YYYY-MM-DD
  time: string
  title: string
  platforms: LivePlatformId[]
  status: "published" | "scheduled" | "draft"
  postId?: string
}
