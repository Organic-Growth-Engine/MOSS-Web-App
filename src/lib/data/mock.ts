/**
 * Illustrative workspace data taken from the Figma screens.
 * Replace with API calls (TanStack Query) once the backend exists.
 */
import type {
  CalendarEntry,
  MediaAsset,
  Member,
  Post,
  SocialAccount,
  Workspace,
} from "@/lib/data/types"

export const workspace: Workspace = {
  id: "ws_studio_north",
  name: "Studio North",
  initials: "SN",
  kind: "Team workspace",
  slug: "studio-north",
  timezone: "America/Los_Angeles",
  timezoneLabel: "America/Los_Angeles · PDT (UTC−07:00)",
  plan: { name: "Team", accountSlots: 10, seats: 5 },
}

export const members: Member[] = [
  { id: "u_maya", name: "Maya Chen", initials: "MC", email: "maya@studionorth.co", role: "Owner" },
  { id: "u_alex", name: "Alex Lee", initials: "AL", email: "alex@studionorth.co", role: "Admin" },
  { id: "u_jamie", name: "Jamie Rivera", initials: "JR", email: "jamie@studionorth.co", role: "Editor" },
]

export const currentUser = members[0]

const standardPermissions = ["Create and publish content", "Read insights & account details"]

export const accounts: SocialAccount[] = [
  {
    id: "acc_ig_main",
    platform: "instagram",
    handle: "@studionorth",
    displayName: "@studionorth",
    accountType: "Business account",
    audience: 12480,
    audienceLabel: "followers",
    status: "connected",
    isDefault: true,
    connectedBy: "Maya Chen",
    connectedOn: "Mar 3, 2026",
    permissions: standardPermissions,
  },
  {
    id: "acc_ig_studio",
    platform: "instagram",
    handle: "@studionorth.studio",
    displayName: "@studionorth.studio",
    accountType: "Creator account",
    audience: 2340,
    audienceLabel: "followers",
    status: "connected",
    isDefault: false,
    connectedBy: "Alex Lee",
    connectedOn: "Mar 18, 2026",
    permissions: standardPermissions,
  },
  {
    id: "acc_li",
    platform: "linkedin",
    handle: "Studio North",
    displayName: "Studio North",
    accountType: "Company page",
    audience: 3850,
    audienceLabel: "followers",
    status: "expired",
    isDefault: false,
    connectedBy: "Maya Chen",
    connectedOn: "Mar 3, 2026",
    permissions: standardPermissions,
  },
  {
    id: "acc_fb",
    platform: "facebook",
    handle: "Studio North",
    displayName: "Studio North",
    accountType: "Business page",
    audience: 4612,
    audienceLabel: "followers",
    status: "connected",
    isDefault: false,
    connectedBy: "Maya Chen",
    connectedOn: "Mar 3, 2026",
    permissions: standardPermissions,
  },
  {
    id: "acc_x",
    platform: "x",
    handle: "@studionorth",
    displayName: "@studionorth",
    accountType: "Professional account",
    audience: 0,
    audienceLabel: "followers",
    status: "not_connected",
    isDefault: false,
    permissions: ["Create and publish content"],
  },
  {
    id: "acc_yt",
    platform: "youtube",
    handle: "@StudioNorth",
    displayName: "@StudioNorth",
    accountType: "YouTube channel",
    audience: 1610,
    audienceLabel: "subscribers",
    status: "connected",
    isDefault: false,
    connectedBy: "Jamie Rivera",
    connectedOn: "Mar 3, 2026",
    permissions: ["Upload videos & Shorts", "Read insights & account details"],
  },
]

export const usedAccountSlots = accounts.filter((a) => a.status !== "not_connected").length

const caption =
  "A little room to grow. Meet our spring collection: thoughtful pieces for slower mornings and greener corners. Discover your new everyday at studionorth.co/spring. #StudioNorth #RoomToGrow"

const allFive = (
  status: Post["destinations"][number]["status"],
  at?: string
): Post["destinations"] => [
  { platform: "instagram", accountLabel: "@studionorth", format: "Reel", status, at },
  { platform: "linkedin", accountLabel: "Studio North", format: "Native video", status, at },
  { platform: "facebook", accountLabel: "Studio North", format: "Reel", status, at },
  { platform: "x", accountLabel: "@studionorth", format: "Video post", status, at },
  { platform: "youtube", accountLabel: "@StudioNorth", format: "Short", status, at },
]

export const posts: Post[] = [
  {
    id: "a-little-room-to-grow",
    title: "A little room to grow",
    mediaType: "Video",
    duration: "0:24",
    campaign: "Spring collection",
    status: "scheduled",
    publishAt: "2026-03-24T10:00:00-07:00",
    createdBy: "Maya Chen",
    destinations: allFive("scheduled"),
    caption,
  },
  {
    id: "made-slowly",
    title: "Made slowly. Made to stay.",
    mediaType: "Image",
    campaign: "Spring collection",
    status: "scheduled",
    publishAt: "2026-03-25T11:30:00-07:00",
    createdBy: "Jamie Rivera",
    destinations: [
      { platform: "instagram", accountLabel: "@studionorth", format: "Post", status: "scheduled" },
      { platform: "facebook", accountLabel: "Studio North", format: "Post", status: "scheduled" },
    ],
    caption: "Made slowly. Made to stay.",
  },
  {
    id: "meet-your-new-corner",
    title: "Meet your new corner",
    mediaType: "Video",
    duration: "0:24",
    campaign: "Spring collection",
    status: "draft",
    editedLabel: "Edited 1h ago",
    createdBy: "Maya Chen",
    destinations: [
      { platform: "x", accountLabel: "@studionorth", format: "Video post", status: "queued" },
      { platform: "linkedin", accountLabel: "Studio North", format: "Native video", status: "queued" },
    ],
    caption: "Meet your new corner.",
  },
  {
    id: "the-spring-edit",
    title: "The spring edit is here",
    mediaType: "Image",
    campaign: "Spring collection",
    status: "published",
    publishAt: "2026-03-23T09:00:00-07:00",
    createdBy: "Alex Lee",
    destinations: [
      { platform: "instagram", accountLabel: "@studionorth", format: "Post", status: "published", at: "9:00:02 AM" },
      { platform: "facebook", accountLabel: "Studio North", format: "Post", status: "published", at: "9:00:03 AM" },
      { platform: "x", accountLabel: "@studionorth", format: "Post", status: "published", at: "9:00:04 AM" },
    ],
    caption: "The spring edit is here.",
  },
  {
    id: "a-slower-kind-of-sunday",
    title: "A slower kind of Sunday",
    mediaType: "Video",
    duration: "0:24",
    campaign: "Studio stories",
    status: "published",
    publishAt: "2026-03-22T10:00:00-07:00",
    createdBy: "Maya Chen",
    destinations: allFive("published", "10:00:03 AM"),
    caption: "A slower kind of Sunday.",
  },
  {
    id: "meet-the-makers",
    title: "Meet the makers",
    mediaType: "Video",
    duration: "0:24",
    campaign: "Studio stories",
    status: "failed",
    publishAt: "2026-03-21T14:00:00-07:00",
    createdBy: "Maya Chen",
    destinations: allFive("published", "2:00:03 PM").map((d) =>
      d.platform === "linkedin"
        ? {
            ...d,
            status: "failed" as const,
            error: { title: "Authorization expired", detail: "No post was created on LinkedIn" },
          }
        : d
    ),
    caption: "Meet the makers.",
  },
  {
    id: "a-softer-season",
    title: "A softer season",
    mediaType: "Video",
    duration: "0:24",
    campaign: "Spring collection",
    status: "published",
    publishAt: "2026-03-20T10:00:00-07:00",
    createdBy: "Jamie Rivera",
    destinations: [
      { platform: "instagram", accountLabel: "@studionorth", format: "Reel", status: "published", at: "10:00:02 AM" },
      { platform: "youtube", accountLabel: "@StudioNorth", format: "Short", status: "published", at: "10:00:06 AM" },
    ],
    caption: "A softer season.",
  },
  {
    id: "from-our-studio",
    title: "From our studio, with care",
    mediaType: "Image",
    campaign: "Studio stories",
    status: "published",
    publishAt: "2026-03-18T11:00:00-07:00",
    createdBy: "Alex Lee",
    destinations: [
      { platform: "linkedin", accountLabel: "Studio North", format: "Post", status: "published", at: "11:00:02 AM" },
      { platform: "x", accountLabel: "@studionorth", format: "Post", status: "published", at: "11:00:03 AM" },
    ],
    caption: "From our studio, with care.",
  },
]

export const postCounts = { all: 24, draft: 6, scheduled: 4, published: 13, failed: 1 }

export function getPost(id: string) {
  return posts.find((p) => p.id === id)
}

export const media: MediaAsset[] = [
  { id: "m1", name: "room-to-grow.mp4", type: "MP4", size: "18.4 MB", duration: "0:24", dimensions: "1080 × 1920", addedOn: "Mar 23", folder: "Spring collection", usage: "Used in 1 scheduled post" },
  { id: "m2", name: "spring-still-life.jpg", type: "JPG", size: "3.2 MB", dimensions: "2400 × 3000", addedOn: "Mar 22", folder: "Spring collection" },
  { id: "m3", name: "the-everyday-edit.jpg", type: "JPG", size: "2.8 MB", dimensions: "2400 × 2400", addedOn: "Mar 21", folder: "Spring collection" },
  { id: "m4", name: "meet-the-makers.mp4", type: "MP4", size: "42.6 MB", duration: "0:24", dimensions: "1080 × 1920", addedOn: "Mar 20", folder: "Studio stories" },
  { id: "m5", name: "soft-morning.jpg", type: "JPG", size: "4.1 MB", dimensions: "3000 × 2400", addedOn: "Mar 22", folder: "Spring collection" },
  { id: "m6", name: "spring-textures.jpg", type: "JPG", size: "2.6 MB", dimensions: "2400 × 3000", addedOn: "Mar 21", folder: "Spring collection" },
  { id: "m7", name: "studio-process.mp4", type: "MP4", size: "28.2 MB", duration: "0:24", dimensions: "1080 × 1920", addedOn: "Mar 20", folder: "Studio stories" },
  { id: "m8", name: "a-greener-corner.jpg", type: "JPG", size: "3.4 MB", dimensions: "2400 × 3000", addedOn: "Mar 19", folder: "Brand essentials" },
]

export const mediaFolders = [
  { id: "all", name: "All assets", count: 48 },
  { id: "spring", name: "Spring collection", count: 18 },
  { id: "stories", name: "Studio stories", count: 12 },
  { id: "brand", name: "Brand essentials", count: 18 },
]

export const calendarEntries: CalendarEntry[] = [
  { id: "c1", date: "2026-03-02", time: "9:00 AM", title: "A fresh start", platforms: ["instagram", "facebook"], status: "published" },
  { id: "c2", date: "2026-03-04", time: "11:00 AM", title: "Meet the makers", platforms: ["linkedin"], status: "published" },
  { id: "c3", date: "2026-03-06", time: "10:00 AM", title: "Small rituals", platforms: ["instagram", "x"], status: "published" },
  { id: "c4", date: "2026-03-09", time: "9:00 AM", title: "Studio notes", platforms: ["linkedin", "facebook"], status: "published" },
  { id: "c5", date: "2026-03-11", time: "2:00 PM", title: "Made by hand", platforms: ["youtube"], status: "published" },
  { id: "c6", date: "2026-03-13", time: "10:00 AM", title: "The weekend edit", platforms: ["instagram"], status: "published" },
  { id: "c7", date: "2026-03-16", time: "9:30 AM", title: "Spring, in detail", platforms: ["instagram", "facebook"], status: "published" },
  { id: "c8", date: "2026-03-18", time: "11:00 AM", title: "From our studio", platforms: ["linkedin", "x"], status: "published" },
  { id: "c9", date: "2026-03-20", time: "10:00 AM", title: "A softer season", platforms: ["instagram", "youtube"], status: "published" },
  { id: "c10", date: "2026-03-22", time: "10:00 AM", title: "A slower Sunday", platforms: ["instagram"], status: "published" },
  { id: "c11", date: "2026-03-24", time: "10:00 AM", title: "A little room to grow", platforms: ["instagram", "linkedin", "facebook", "x", "youtube"], status: "scheduled", postId: "a-little-room-to-grow" },
  { id: "c12", date: "2026-03-25", time: "11:30 AM", title: "Made to stay", platforms: ["instagram", "facebook"], status: "scheduled", postId: "made-slowly" },
  { id: "c13", date: "2026-03-27", time: "9:00 AM", title: "Meet your new corner", platforms: ["x", "linkedin"], status: "draft", postId: "meet-your-new-corner" },
  { id: "c14", date: "2026-03-30", time: "10:00 AM", title: "March, in moments", platforms: ["instagram", "youtube"], status: "scheduled" },
]

/** "Today" in the illustrative data. */
export const demoToday = "2026-03-23"

export const analytics = {
  rangeLabel: "Mar 1 – 23, 2026",
  comparedLabel: "Compared with Feb 6 – 28, 2026 · Updated 12 minutes ago",
  kpis: [
    { label: "Impressions", value: "128.4K", delta: "12.8% vs. previous period" },
    { label: "Engagements", value: "6,163", delta: "18.6% vs. previous period" },
    { label: "Engagement rate", value: "4.8%", delta: "0.6 pts vs. previous period" },
    { label: "Audience", value: "24,892", delta: "8.2% vs. previous period" },
  ],
  // Daily impressions, Mar 1–23 (current) vs. the previous period.
  daily: [
    2900, 3300, 4300, 3900, 3400, 4100, 4900, 5000, 5500, 4800, 4200, 5100, 6700, 6100, 5900,
    5600, 7400, 6900, 6500, 7100, 8700, 8200, 9400,
  ].map((current, i) => ({
    day: i + 1,
    current,
    previous: [
      2000, 2400, 3100, 2700, 2300, 2900, 3500, 3600, 4000, 3500, 3000, 3700, 4700, 4300, 4200,
      4000, 5300, 5000, 4700, 5100, 6000, 5800, 7200,
    ][i],
  })),
  byPlatform: [
    { platform: "instagram" as const, impressions: 52400, engagements: 2840, rate: "5.4%", audience: 10842 },
    { platform: "linkedin" as const, impressions: 28600, engagements: 1175, rate: "4.1%", audience: 4650 },
    { platform: "facebook" as const, impressions: 24200, engagements: 1020, rate: "4.2%", audience: 5840 },
    { platform: "x" as const, impressions: 9800, engagements: 428, rate: "4.4%", audience: 2160 },
    { platform: "youtube" as const, impressions: 13400, engagements: 700, rate: "5.2%", audience: 1400 },
  ],
  insight: "Instagram Reels drove 41% of impressions during this period.",
}

export const recentActivity = [
  { title: "The spring edit is here", detail: "Published to 3 accounts · Today, 9 AM" },
  { title: "A slower kind of Sunday", detail: "Published to 5 accounts · Yesterday" },
]
