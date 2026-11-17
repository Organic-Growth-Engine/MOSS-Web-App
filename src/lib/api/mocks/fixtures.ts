/**
 * Mock fixtures, shaped exactly like API responses (see docs/api/openapi.yaml).
 * Illustrative data from the Figma screens: the "Studio North" workspace on Mon, Mar 23 2026.
 */
import type {
  AnalyticsOverview,
  BestTimes,
  Destination,
  Invitation,
  MediaAsset,
  MediaFolder,
  MediaFormat,
  Member,
  Notification,
  NotificationPreferences,
  Platform,
  PlatformMetrics,
  Post,
  PostStatus,
  SecurityOverview,
  SocialAccount,
  StorageUsage,
  User,
  Workspace,
} from "@/lib/api/types"
import { defaultFormat } from "@/config/platforms"

/** The moment the fixtures describe ("today, around noon" in the workspace timezone). */
export const FIXTURE_NOW = "2026-03-23T12:00:00-07:00"
export const WORKSPACE_ID = "ws_studio_north"

// ── Identity ────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: "usr_maya", name: "Maya Chen", initials: "MC", email: "maya@studionorth.co", authProvider: "google", createdAt: "2026-03-01T09:00:00-08:00" },
  { id: "usr_alex", name: "Alex Lee", initials: "AL", email: "alex@studionorth.co", authProvider: "password", createdAt: "2026-03-01T10:00:00-08:00" },
  { id: "usr_jamie", name: "Jamie Rivera", initials: "JR", email: "jamie@studionorth.co", authProvider: "password", createdAt: "2026-03-02T10:00:00-08:00" },
]

/** Mock-only: password for every fixture user signing in with email. */
export const MOCK_PASSWORD = "origin-demo"

export const security: SecurityOverview = {
  authProvider: "google",
  twoFactor: {
    managedBy: "google",
    enabled: null,
    manageUrl: "https://myaccount.google.com/signinoptions/two-step-verification",
  },
  sessions: [
    { id: "ses_31f0", device: "Chrome on macOS", location: "Portland, US", lastActiveAt: FIXTURE_NOW, current: true },
    { id: "ses_8a21", device: "Safari on iPhone", location: "Portland, US", lastActiveAt: "2026-03-21T08:15:00-07:00", current: false },
  ],
}

export const invitationTokens: Record<string, { invitation: Invitation; workspaceId: string; userExists: boolean }> = {
  inv_tk_demo: {
    workspaceId: WORKSPACE_ID,
    userExists: false,
    invitation: {
      id: "inv_5Jq2xW",
      email: "sam@studionorth.co",
      role: "editor",
      status: "pending",
      invitedBy: { userId: "usr_maya", name: "Maya Chen" },
      expiresAt: "2026-03-30T12:00:00-07:00",
      createdAt: "2026-03-23T08:00:00-07:00",
    },
  },
}

// ── Workspace ───────────────────────────────────────────────────────────

export const workspace: Workspace = {
  id: WORKSPACE_ID,
  name: "Studio North",
  initials: "SN",
  kind: "team",
  slug: "studio-north",
  timezone: "America/Los_Angeles",
  plan: { name: "Team", accountSlots: 10, seats: 5, extraSocialAccounts: 1 },
  seatsUsed: 3,
  createdAt: "2026-03-01T09:00:00-08:00",
}

export const members: Member[] = [
  { userId: "usr_maya", name: "Maya Chen", initials: "MC", email: "maya@studionorth.co", role: "owner", joinedAt: "2026-03-01T09:00:00-08:00" },
  { userId: "usr_alex", name: "Alex Lee", initials: "AL", email: "alex@studionorth.co", role: "admin", joinedAt: "2026-03-01T10:00:00-08:00" },
  { userId: "usr_jamie", name: "Jamie Rivera", initials: "JR", email: "jamie@studionorth.co", role: "editor", joinedAt: "2026-03-02T10:00:00-08:00" },
]

// ── Accounts ────────────────────────────────────────────────────────────

const standardPermissions = ["Create and publish content", "Read insights & account details"]
const maya = { userId: "usr_maya", name: "Maya Chen" }
const alex = { userId: "usr_alex", name: "Alex Lee" }
const jamie = { userId: "usr_jamie", name: "Jamie Rivera" }

export const socialAccounts: SocialAccount[] = [
  {
    id: "acc_ig_main", platform: "instagram", handle: "@studionorth", displayName: "@studionorth",
    accountType: "Business account", audience: 12480, audienceLabel: "followers", status: "connected",
    isDefault: true, isAddOn: false, connectedBy: maya, connectedAt: "2026-03-03T10:00:00-08:00",
    authorizationExpiresAt: "2026-05-02T10:00:00-07:00", permissions: standardPermissions,
  },
  {
    id: "acc_ig_studio", platform: "instagram", handle: "@studionorth.studio", displayName: "@studionorth.studio",
    accountType: "Creator account", audience: 2340, audienceLabel: "followers", status: "connected",
    isDefault: false, isAddOn: true, connectedBy: alex, connectedAt: "2026-03-18T10:00:00-07:00",
    authorizationExpiresAt: "2026-05-17T10:00:00-07:00", permissions: standardPermissions,
  },
  {
    id: "acc_li", platform: "linkedin", handle: "Studio North", displayName: "Studio North",
    accountType: "Company page", audience: 3850, audienceLabel: "followers", status: "expired",
    isDefault: true, isAddOn: false, connectedBy: maya, connectedAt: "2026-03-03T10:05:00-08:00",
    authorizationExpiresAt: "2026-03-21T13:00:00-07:00", permissions: standardPermissions,
  },
  {
    id: "acc_fb", platform: "facebook", handle: "Studio North", displayName: "Studio North",
    accountType: "Business page", audience: 4612, audienceLabel: "followers", status: "connected",
    isDefault: true, isAddOn: false, connectedBy: maya, connectedAt: "2026-03-03T10:10:00-08:00",
    authorizationExpiresAt: "2026-05-02T10:10:00-07:00", permissions: standardPermissions,
  },
  {
    id: "acc_x", platform: "x", handle: "@studionorth", displayName: "@studionorth",
    accountType: "Professional account", audience: 0, audienceLabel: "followers", status: "not_connected",
    isDefault: true, isAddOn: false, connectedBy: null, connectedAt: null, authorizationExpiresAt: null,
    permissions: ["Create and publish content"],
  },
  {
    id: "acc_yt", platform: "youtube", handle: "@StudioNorth", displayName: "@StudioNorth",
    accountType: "YouTube channel", audience: 1610, audienceLabel: "subscribers", status: "connected",
    isDefault: true, isAddOn: false, connectedBy: jamie, connectedAt: "2026-03-03T10:15:00-08:00",
    authorizationExpiresAt: "2026-05-02T10:15:00-07:00",
    permissions: ["Upload videos & Shorts", "Read insights & account details"],
  },
]

// ── Media ───────────────────────────────────────────────────────────────

export const mediaFolders: Omit<MediaFolder, "assetCount">[] = [
  { id: "fld_spring", name: "Spring collection" },
  { id: "fld_stories", name: "Studio stories" },
  { id: "fld_brand", name: "Brand essentials" },
]

const mime: Record<MediaFormat, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime",
}

function asset(
  slug: string, name: string, format: MediaFormat, mb: number, width: number, height: number,
  folderId: string, createdAt: string, durationSeconds: number | null = null
): MediaAsset {
  const kind = format === "mp4" || format === "mov" ? "video" : "image"
  return {
    id: `med_${slug}`, name, kind, format, mimeType: mime[format], sizeBytes: Math.round(mb * 1_000_000),
    durationSeconds, width, height, folderId,
    url: `https://media.origin.example/ws_studio_north/${name}`,
    thumbnailUrl: null, status: "ready", usage: { scheduledPostCount: 0, postIds: [] },
    createdBy: maya, createdAt,
  }
}

/** The eight assets shown on the first page, newest first, then 40 older ones. */
const headlineMedia: MediaAsset[] = [
  asset("room_to_grow", "room-to-grow.mp4", "mp4", 18.4, 1080, 1920, "fld_spring", "2026-03-23T08:10:00-07:00", 24),
  asset("spring_still_life", "spring-still-life.jpg", "jpg", 3.2, 2400, 3000, "fld_spring", "2026-03-22T15:00:00-07:00"),
  asset("soft_morning", "soft-morning.jpg", "jpg", 4.1, 3000, 2400, "fld_spring", "2026-03-22T09:00:00-07:00"),
  asset("everyday_edit", "the-everyday-edit.jpg", "jpg", 2.8, 2400, 2400, "fld_spring", "2026-03-21T15:00:00-07:00"),
  asset("spring_textures", "spring-textures.jpg", "jpg", 2.6, 2400, 3000, "fld_spring", "2026-03-21T09:00:00-07:00"),
  asset("meet_the_makers", "meet-the-makers.mp4", "mp4", 42.6, 1080, 1920, "fld_stories", "2026-03-20T15:00:00-07:00", 24),
  asset("studio_process", "studio-process.mp4", "mp4", 28.2, 1080, 1920, "fld_stories", "2026-03-20T09:00:00-07:00", 24),
  asset("greener_corner", "a-greener-corner.jpg", "jpg", 3.4, 2400, 3000, "fld_brand", "2026-03-19T10:00:00-07:00"),
]

const olderNames: Record<string, string[]> = {
  fld_spring: ["linen-close-up", "terracotta-row", "window-light", "fern-detail", "spring-palette", "morning-table", "potting-bench", "moss-study", "glaze-tests", "sunroom", "green-shelf", "bud-vase", "spring-lookbook"],
  fld_stories: ["kiln-day", "hands-at-work", "studio-tour", "wheel-throwing", "packing-orders", "team-lunch", "sketchbook", "clay-prep", "maker-portrait", "late-shift"],
  fld_brand: ["logo-cream", "logo-forest", "wordmark-dark", "wordmark-light", "palette-card", "type-specimen", "brand-pattern", "store-front", "tote-mockup", "label-mockup", "business-card", "gift-wrap", "newsletter-header", "social-avatar", "brand-texture", "packaging-flat", "lookbook-cover"],
}

const olderMedia: MediaAsset[] = Object.entries(olderNames).flatMap(([folderId, names], f) =>
  names.map((n, i) => {
    const day = 18 - ((i + f * 3) % 17)
    const video = n === "studio-tour" || n === "wheel-throwing" || n === "kiln-day"
    return asset(
      n.replace(/-/g, "_"), `${n}.${video ? "mp4" : n.startsWith("logo") ? "png" : "jpg"}`,
      video ? "mp4" : n.startsWith("logo") ? "png" : "jpg",
      video ? 24 + i : 1.8 + ((i * 7) % 30) / 10, video ? 1080 : 2400, video ? 1920 : 3000, folderId,
      `2026-${day > 0 ? "03" : "02"}-${String(day > 0 ? day : 28 + day).padStart(2, "0")}T0${8 + (i % 2)}:${String(10 + f * 10 + i).padStart(2, "0")}:00-07:00`,
      video ? 32 : null
    )
  })
)

export const media: MediaAsset[] = [...headlineMedia, ...olderMedia]

export const storage: StorageUsage = {
  usedBytes: 1_800_000_000,
  limitBytes: 10_000_000_000,
  maxFileBytes: 1_000_000_000,
  allowedFormats: ["jpg", "png", "webp", "mp4", "mov"],
}

// ── Content ─────────────────────────────────────────────────────────────

const label: Record<Platform, { accountId: string; accountLabel: string }> = {
  instagram: { accountId: "acc_ig_main", accountLabel: "@studionorth" },
  linkedin: { accountId: "acc_li", accountLabel: "Studio North" },
  facebook: { accountId: "acc_fb", accountLabel: "Studio North" },
  x: { accountId: "acc_x", accountLabel: "@studionorth" },
  youtube: { accountId: "acc_yt", accountLabel: "@StudioNorth" },
}

let dstSeq = 0
function destinations(
  platforms: Platform[], kind: "image" | "video" | null, status: Destination["status"], publishAt?: string
): Destination[] {
  return platforms.map((platform, i) => ({
    id: `dst_${(++dstSeq).toString(16).padStart(4, "0")}`,
    ...label[platform],
    platform,
    format: defaultFormat(platform, kind),
    captionOverride: null,
    title: null,
    status,
    publishedAt:
      status === "published" && publishAt
        ? new Date(new Date(publishAt).getTime() + (2 + i) * 1000).toISOString()
        : null,
    externalUrl: null,
    error: null,
  }))
}

function mediaRef(id: string) {
  const m = media.find((a) => a.id === id)!
  return {
    id: m.id, name: m.name, kind: m.kind, format: m.format, sizeBytes: m.sizeBytes,
    durationSeconds: m.durationSeconds, width: m.width, height: m.height, thumbnailUrl: m.thumbnailUrl,
  }
}

function post(p: {
  id: string; title: string; caption?: string; link?: string; mediaId?: string; status: PostStatus
  publishAt?: string; updatedAt?: string; by: { userId: string; name: string }; platforms: Platform[]
}): Post {
  const ref = p.mediaId ? mediaRef(p.mediaId) : undefined
  const kind = ref?.kind ?? null
  const dStatus: Destination["status"] =
    p.status === "draft" ? "queued" : p.status === "scheduled" ? "scheduled" : "published"
  const updatedAt = p.updatedAt ?? p.publishAt ?? FIXTURE_NOW
  return {
    id: p.id, title: p.title, caption: p.caption ?? `${p.title}.`, link: p.link ?? null,
    media: ref ? [ref] : [], mediaType: kind, status: p.status, publishAt: p.publishAt ?? null,
    createdBy: p.by, createdAt: new Date(new Date(updatedAt).getTime() - 86_400_000).toISOString(),
    updatedAt, destinations: destinations(p.platforms, kind, dStatus, p.publishAt),
  }
}

const roomCaption =
  "A little room to grow. Meet our spring collection: thoughtful pieces for slower mornings and greener corners. Discover your new everyday at studionorth.co/spring. #StudioNorth #RoomToGrow"
const all5: Platform[] = ["instagram", "linkedin", "facebook", "x", "youtube"]

const meetTheMakers = post({
  id: "post_9c3e58", title: "Meet the makers", mediaId: "med_meet_the_makers", status: "partially_published",
  publishAt: "2026-03-21T14:00:00-07:00", by: maya, platforms: all5,
})
meetTheMakers.destinations = meetTheMakers.destinations.map((d) =>
  d.platform === "linkedin"
    ? { ...d, status: "failed", publishedAt: null, error: { code: "authorization_expired", title: "Authorization expired", detail: "No post was created on LinkedIn" } }
    : d
)

const roomToGrow = post({
  id: "post_8f2c41", title: "A little room to grow", caption: roomCaption, link: "https://studionorth.co/spring",
  mediaId: "med_room_to_grow", status: "scheduled", publishAt: "2026-03-24T10:00:00-07:00",
  updatedAt: "2026-03-23T08:30:00-07:00", by: maya, platforms: all5,
})
roomToGrow.destinations = roomToGrow.destinations.map((d) =>
  d.platform === "youtube" ? { ...d, title: "A little room to grow | Studio North" } : d
)

export const posts: Post[] = [
  // Scheduled (4)
  roomToGrow,
  post({ id: "post_3a91d7", title: "Made slowly. Made to stay.", mediaId: "med_spring_still_life", status: "scheduled", publishAt: "2026-03-25T11:30:00-07:00", updatedAt: "2026-03-22T16:00:00-07:00", by: jamie, platforms: ["instagram", "facebook"] }),
  post({ id: "post_c4e802", title: "Small batch, big heart", mediaId: "med_everyday_edit", status: "scheduled", publishAt: "2026-03-26T09:00:00-07:00", updatedAt: "2026-03-22T11:00:00-07:00", by: alex, platforms: ["linkedin", "facebook"] }),
  post({ id: "post_5d17b3", title: "March, in moments", mediaId: "med_studio_process", status: "scheduled", publishAt: "2026-03-28T10:00:00-07:00", updatedAt: "2026-03-21T10:00:00-07:00", by: maya, platforms: ["instagram", "youtube"] }),
  // Drafts (6) — two have a planned time this week
  post({ id: "post_e7b2a9", title: "Meet your new corner", mediaId: "med_studio_process", status: "draft", publishAt: "2026-03-27T09:00:00-07:00", updatedAt: "2026-03-23T11:00:00-07:00", by: maya, platforms: ["x", "linkedin"] }),
  post({ id: "post_2b6f0e", title: "A corner for slow mornings", mediaId: "med_soft_morning", status: "draft", publishAt: "2026-03-26T14:00:00-07:00", updatedAt: "2026-03-22T17:00:00-07:00", by: jamie, platforms: ["instagram"] }),
  post({ id: "post_91d3c5", title: "Behind the glaze", mediaId: "med_meet_the_makers", status: "draft", updatedAt: "2026-03-21T15:00:00-07:00", by: alex, platforms: ["instagram", "youtube"] }),
  post({ id: "post_0f4a6e", title: "Studio playlist, vol. 2", status: "draft", updatedAt: "2026-03-19T12:00:00-07:00", by: jamie, platforms: ["x"] }),
  post({ id: "post_6c8e21", title: "Spring care guide", mediaId: "med_spring_textures", status: "draft", updatedAt: "2026-03-18T12:00:00-07:00", by: maya, platforms: ["instagram", "facebook"] }),
  post({ id: "post_a3b7f9", title: "Ask the makers", mediaId: "med_greener_corner", status: "draft", updatedAt: "2026-03-15T12:00:00-07:00", by: alex, platforms: ["linkedin"] }),
  // Published (13) + partially published (1)
  post({ id: "post_d5e1b0", title: "The spring edit is here", mediaId: "med_spring_textures", status: "published", publishAt: "2026-03-23T09:00:00-07:00", by: alex, platforms: ["instagram", "facebook", "x"] }),
  post({ id: "post_7e40c2", title: "A slower kind of Sunday", mediaId: "med_studio_process", status: "published", publishAt: "2026-03-22T10:00:00-07:00", by: maya, platforms: ["instagram", "facebook", "x", "youtube"] }),
  meetTheMakers,
  post({ id: "post_4f8a3d", title: "A softer season", mediaId: "med_meet_the_makers", status: "published", publishAt: "2026-03-20T10:00:00-07:00", by: jamie, platforms: ["instagram", "youtube"] }),
  post({ id: "post_b2c9e7", title: "From our studio, with care", mediaId: "med_greener_corner", status: "published", publishAt: "2026-03-18T11:00:00-07:00", by: alex, platforms: ["linkedin", "x"] }),
  post({ id: "post_a81f3e", title: "Spring, in detail", mediaId: "med_spring_still_life", status: "published", publishAt: "2026-03-16T09:30:00-07:00", by: maya, platforms: ["instagram", "facebook"] }),
  post({ id: "post_2e9b4d", title: "The weekend edit", mediaId: "med_spring_textures", status: "published", publishAt: "2026-03-13T10:00:00-07:00", by: jamie, platforms: ["instagram"] }),
  post({ id: "post_c7f512", title: "Made by hand", mediaId: "med_meet_the_makers", status: "published", publishAt: "2026-03-11T14:00:00-07:00", by: jamie, platforms: ["youtube"] }),
  post({ id: "post_63a0f9", title: "Studio notes", mediaId: "med_greener_corner", status: "published", publishAt: "2026-03-09T09:00:00-07:00", by: alex, platforms: ["linkedin", "facebook"] }),
  post({ id: "post_8d27c1", title: "Small rituals", mediaId: "med_everyday_edit", status: "published", publishAt: "2026-03-06T10:00:00-08:00", by: maya, platforms: ["instagram", "x"] }),
  post({ id: "post_f03b8a", title: "Studio sketches", mediaId: "med_spring_still_life", status: "published", publishAt: "2026-03-04T11:00:00-08:00", by: alex, platforms: ["linkedin"] }),
  post({ id: "post_19e6d4", title: "A fresh start", mediaId: "med_soft_morning", status: "published", publishAt: "2026-03-02T09:00:00-08:00", by: maya, platforms: ["instagram", "facebook"] }),
  post({ id: "post_e0d6f7", title: "A quiet February", mediaId: "med_studio_process", status: "published", publishAt: "2026-02-27T09:00:00-08:00", by: maya, platforms: ["instagram", "youtube"] }),
  post({ id: "post_5b4c0a", title: "Winter, winding down", mediaId: "med_soft_morning", status: "published", publishAt: "2026-02-24T10:00:00-08:00", by: jamie, platforms: ["instagram", "facebook"] }),
]

// ── Analytics ───────────────────────────────────────────────────────────

/** Daily impressions, Mar 1–23 2026. */
export const dailyCurrent = [
  2900, 3300, 4300, 3900, 3400, 4100, 4900, 5000, 5500, 4800, 4200, 5100, 6700, 6100, 5900, 5600,
  7400, 6900, 6500, 7100, 8700, 8200, 9400,
]
/** Daily impressions, Feb 6–28 2026 (the comparison period). */
export const dailyPrevious = [
  2000, 2400, 3100, 2700, 2300, 2900, 3500, 3600, 4000, 3500, 3000, 3700, 4700, 4300, 4200, 4000,
  5300, 5000, 4700, 5100, 6000, 5800, 7200,
]

export const analyticsOverview: AnalyticsOverview = {
  range: { from: "2026-03-01", to: "2026-03-23" },
  comparisonRange: { from: "2026-02-06", to: "2026-02-28" },
  updatedAt: "2026-03-23T11:48:00-07:00",
  kpis: {
    impressions: { value: 128400, previous: 113830, change: 12.8, changeUnit: "percent" },
    engagements: { value: 6163, previous: 5197, change: 18.6, changeUnit: "percent" },
    engagementRate: { value: 4.8, previous: 4.2, change: 0.6, changeUnit: "points" },
    audience: { value: 24892, previous: 23006, change: 8.2, changeUnit: "percent" },
  },
  insight: "Instagram Reels drove 41% of impressions during this period.",
}

export const platformMetrics: PlatformMetrics[] = [
  { platform: "instagram", impressions: 52400, engagements: 2840, engagementRate: 5.4, audience: 10842 },
  { platform: "linkedin", impressions: 28600, engagements: 1175, engagementRate: 4.1, audience: 4650 },
  { platform: "facebook", impressions: 24200, engagements: 1020, engagementRate: 4.2, audience: 5840 },
  { platform: "x", impressions: 9800, engagements: 428, engagementRate: 4.4, audience: 2160 },
  { platform: "youtube", impressions: 13400, engagements: 700, engagementRate: 5.2, audience: 1400 },
]

export const bestTimes: BestTimes = {
  summary: "Your audience is most active Tuesday and Thursday at 10 AM.",
  slots: [
    { weekday: 2, hour: 10 },
    { weekday: 4, hour: 10 },
  ],
}

// ── Notifications ───────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: "ntf_1a2b3c", type: "account_expired", severity: "warning", title: "LinkedIn authorization expired",
    detail: "Reconnect Studio North to resume scheduled publishing.", href: "/accounts", readAt: null,
    createdAt: "2026-03-23T09:30:00-07:00",
  },
  {
    id: "ntf_4d5e6f", type: "publish_succeeded", severity: "success", title: "The spring edit is here",
    detail: "Published to 3 accounts · Today, 9 AM", href: "/posts/post_d5e1b0",
    readAt: "2026-03-23T09:10:00-07:00", createdAt: "2026-03-23T09:00:05-07:00",
  },
]

export const notificationPreferences: NotificationPreferences = {
  publishingResults: true,
  accountHealth: true,
  scheduleReminders: false,
  weeklyInsights: true,
  emailEnabled: true,
}
