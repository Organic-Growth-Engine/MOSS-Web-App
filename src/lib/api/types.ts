/**
 * Request/response types for the Origin API.
 * Mirrors `components/schemas` in docs/api/openapi.yaml one-to-one — keep them in sync.
 */

// ── Common ──────────────────────────────────────────────────────────────

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "PAYMENT_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "PLAN_LIMIT_REACHED"
  | "ACCOUNT_LOCKED"
  | "VALIDATION_FAILED"
  | "INTERNAL"

export type FieldError = { field: string; message: string }

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; details?: FieldError[]; requestId: string }
}

export type PageMeta = { page: number; pageSize: number; total: number; totalPages: number }
export type Page<T, M = PageMeta> = { data: T[]; meta: M }
export type List<T> = { data: T[] }
export type PageParams = { page?: number; pageSize?: number }

/** YYYY-MM-DD */
export type DateString = string
/** ISO 8601 date-time */
export type DateTimeString = string

export type DateRange = { from: DateString; to: DateString }
export type UserRef = { userId: string; name: string }
export type RedirectUrl = { url: string }

export type Platform = "instagram" | "linkedin" | "facebook" | "x" | "youtube"
export type Role = "owner" | "admin" | "editor"
export type ExportFormat = "csv" | "pdf"

// ── Identity ────────────────────────────────────────────────────────────

export type AuthProviderId = "google" | "password"
export type AuthProvider = { id: AuthProviderId; name: string; kind: "oauth" | "password" }

export type AuthorizationCodeGrant = {
  grantType: "authorization_code"
  code: string
  codeVerifier: string
  redirectUri: string
}
export type RefreshTokenGrant = { grantType: "refresh_token" }
export type TokenRequest = AuthorizationCodeGrant | RefreshTokenGrant
export type TokenResponse = { accessToken: string; tokenType: "Bearer"; expiresIn: number }

export type PasswordLoginRequest = { email: string; password: string }
export type SignUpRequest = { name: string; email: string; password: string; workspaceName: string }
export type PasswordResetRequest = { email: string }
export type PasswordResetConfirmRequest = { token: string; password: string }

export type InvitationPreview = {
  workspaceName: string
  email: string
  role: Role
  invitedBy: UserRef
  expiresAt: DateTimeString
  userExists: boolean
}
export type AcceptInvitationRequest = { name?: string; password?: string }

export type User = {
  id: string
  name: string
  initials: string
  email: string
  authProvider: AuthProviderId
  createdAt: DateTimeString
}
export type Membership = { workspaceId: string; role: Role }
export type CurrentUser = User & { memberships: Membership[] }
export type UpdateProfileRequest = { name?: string; email?: string }

export type Session = {
  id: string
  device: string
  location?: string
  lastActiveAt: DateTimeString
  current: boolean
}
export type SecurityOverview = {
  authProvider: AuthProviderId
  /** Google accounts only; null for email/password accounts. */
  twoFactor: { managedBy: "google"; enabled?: boolean | null; manageUrl: string } | null
  sessions: Session[]
}

// ── Workspace ───────────────────────────────────────────────────────────

export type Plan = { name: string; accountSlots: number; seats: number; extraSocialAccounts: number }
export type WorkspaceKind = "team" | "personal"

export type Workspace = {
  id: string
  name: string
  initials: string
  kind: WorkspaceKind
  slug: string
  timezone: string
  plan: Plan
  seatsUsed: number
  createdAt: DateTimeString
}
export type WorkspaceSummary = {
  id: string
  name: string
  initials: string
  kind: WorkspaceKind
  role: Role
}
export type CreateWorkspaceRequest = { name: string; timezone?: string }
export type UpdateWorkspaceRequest = { name?: string; slug?: string; timezone?: string }

export type Member = {
  userId: string
  name: string
  initials: string
  email: string
  role: Role
  joinedAt: DateTimeString
}
export type UpdateMemberRequest = { role: Role }
export type ListMembersParams = PageParams & { sort?: "name" | "-name" | "joinedAt" | "-joinedAt" }

export type CreateInvitationRequest = { email: string; role: Exclude<Role, "owner"> }
export type Invitation = {
  id: string
  email: string
  role: Role
  status: "pending" | "accepted" | "expired"
  invitedBy: UserRef
  expiresAt: DateTimeString
  createdAt: DateTimeString
}
export type BillingPortalRequest = { returnUrl: string }
/** Buys a paid extra-account slot, usable on any platform. */
export type CheckoutSessionRequest = {
  item: "extra_social_account"
  quantity?: number
  successUrl: string
  cancelUrl: string
}

// ── Accounts ────────────────────────────────────────────────────────────

export type AccountStatus = "connected" | "expires_soon" | "expired" | "not_connected"

export type SocialAccount = {
  id: string
  platform: Platform
  handle: string
  displayName: string
  accountType: string
  audience: number
  audienceLabel: "followers" | "subscribers"
  status: AccountStatus
  /** First connected account on the platform: locked, and Compose always publishes to it. */
  isDefault: boolean
  /** Paid extra account on a platform that already has its default. */
  isAddOn: boolean
  connectedBy?: UserRef | null
  connectedAt?: DateTimeString | null
  authorizationExpiresAt?: DateTimeString | null
  permissions: string[]
}
export type ListSocialAccountsParams = { platform?: Platform; status?: AccountStatus[] }
export type StartConnectionRequest = { platform: Platform; redirectUri: string }
export type ReconnectRequest = { redirectUri: string }
export type AuthorizationRedirect = { authorizationUrl: string; state: string }

// ── Content ─────────────────────────────────────────────────────────────

export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partially_published"
  | "failed"
export type DestinationStatus = "queued" | "scheduled" | "publishing" | "published" | "failed"
export type DestinationFormat = "post" | "reel" | "native_video" | "video_post" | "short"

export type MediaRef = {
  id: string
  name: string
  kind: MediaKind
  format: MediaFormat
  sizeBytes: number
  durationSeconds?: number | null
  width: number
  height: number
  thumbnailUrl?: string | null
}
export type DestinationError = { code: string; title: string; detail: string }
export type Destination = {
  id: string
  accountId: string
  platform: Platform
  accountLabel: string
  format: DestinationFormat
  captionOverride?: string | null
  title?: string | null
  status: DestinationStatus
  publishedAt?: DateTimeString | null
  externalUrl?: string | null
  error?: DestinationError | null
}
export type Post = {
  id: string
  title: string
  caption: string
  link?: string | null
  media: MediaRef[]
  mediaType: MediaKind | null
  status: PostStatus
  publishAt?: DateTimeString | null
  createdBy: UserRef
  createdAt: DateTimeString
  updatedAt: DateTimeString
  destinations: Destination[]
}

export type DestinationInput = {
  platform: Platform
  format: DestinationFormat
  captionOverride?: string | null
  title?: string | null
}
export type PostInput = {
  title: string
  caption?: string
  link?: string | null
  mediaIds?: string[]
  publishAt?: DateTimeString | null
  destinations?: DestinationInput[]
}
export type UpdatePostRequest = Partial<PostInput>
export type SchedulePostRequest = { publishAt: DateTimeString }

export type PostFilters = {
  status?: PostStatus[]
  platform?: Platform
  q?: string
  from?: DateString
  to?: DateString
}
export type ListPostsParams = PostFilters &
  PageParams & { sort?: "publishAt" | "-publishAt" | "updatedAt" | "-updatedAt" }
export type PostCountsParams = Omit<PostFilters, "status">

export type PostCounts = {
  all: number
  draft: number
  scheduled: number
  publishing: number
  published: number
  partiallyPublished: number
  failed: number
}
export type PublishingStats = {
  postsPublished: number
  destinationSuccessRate: number
  destinationsNeedingAttention: number
  connectedPlatforms: number
}
export type HashtagSuggestionRequest = { caption: string; platforms?: Platform[] }
export type HashtagSuggestions = { hashtags: string[] }

export type CalendarEntry = {
  postId: string
  title: string
  publishAt: DateTimeString
  status: PostStatus
  platforms: Platform[]
  mediaType: MediaKind | null
}
export type CalendarParams = { from: DateString; to: DateString; platform?: Platform }

// ── Media ───────────────────────────────────────────────────────────────

export type MediaKind = "image" | "video"
export type MediaFormat = "jpg" | "png" | "webp" | "mp4" | "mov"

export type MediaAsset = {
  id: string
  name: string
  kind: MediaKind
  format: MediaFormat
  mimeType: string
  sizeBytes: number
  durationSeconds?: number | null
  width: number
  height: number
  folderId: string | null
  url: string
  thumbnailUrl?: string | null
  status: "processing" | "ready" | "failed"
  usage: { scheduledPostCount: number; postIds: string[] }
  createdBy: UserRef
  createdAt: DateTimeString
}
export type ListMediaParams = PageParams & {
  folderId?: string
  kind?: MediaKind
  q?: string
  sort?: "createdAt" | "-createdAt"
}
export type UpdateMediaRequest = { name?: string; folderId?: string | null }
export type CreateUploadRequest = {
  fileName: string
  contentType: string
  sizeBytes: number
  folderId?: string | null
}
export type UploadTicket = {
  uploadId: string
  uploadUrl: string
  method: "PUT"
  headers: Record<string, string>
  expiresAt: DateTimeString
}
export type MediaFolder = { id: string; name: string; assetCount: number }
export type MediaFolderList = { data: MediaFolder[]; meta: { totalAssets: number } }
export type CreateFolderRequest = { name: string }
export type StorageUsage = {
  usedBytes: number
  limitBytes: number
  maxFileBytes: number
  allowedFormats: MediaFormat[]
}

// ── Analytics ───────────────────────────────────────────────────────────

export type Kpi = { value: number; previous: number; change: number; changeUnit: "percent" | "points" }
export type AnalyticsOverview = {
  range: DateRange
  comparisonRange: DateRange
  updatedAt: DateTimeString
  kpis: { impressions: Kpi; engagements: Kpi; engagementRate: Kpi; audience: Kpi }
  insight?: string | null
}
export type AnalyticsRangeParams = DateRange & { platform?: Platform }
export type TimeseriesParams = AnalyticsRangeParams & {
  metric: "impressions" | "engagements"
  interval?: "day"
}
export type TimeseriesPoint = { date: DateString; current: number; previous: number }
export type PlatformMetrics = {
  platform: Platform
  impressions: number
  engagements: number
  engagementRate: number
  audience: number
}
export type BestTimes = { summary: string; slots: { weekday: number; hour: number }[] }

// ── Notifications ───────────────────────────────────────────────────────

export type NotificationType =
  | "account_expired"
  | "account_expires_soon"
  | "publish_succeeded"
  | "publish_partially_failed"
  | "publish_failed"
  | "invitation_accepted"
export type Notification = {
  id: string
  type: NotificationType
  severity: "success" | "warning" | "error" | "info"
  title: string
  detail: string
  href: string
  readAt?: DateTimeString | null
  createdAt: DateTimeString
}
export type NotificationPage = Page<Notification, PageMeta & { unreadCount: number }>
export type ListNotificationsParams = PageParams & { unread?: boolean }
export type NotificationPreferences = {
  publishingResults: boolean
  accountHealth: boolean
  scheduleReminders: boolean
  weeklyInsights: boolean
  emailEnabled: boolean
}

export type RealtimeEventType = "notification.created" | "post.updated" | "account.updated" | "metrics.updated"
/** One message on GET /workspaces/{workspaceId}/events. */
export type RealtimeEvent = {
  id: string
  type: RealtimeEventType
  occurredAt: DateTimeString
  notification?: Notification
  postId?: string
  postStatus?: PostStatus
  accountId?: string
  accountStatus?: AccountStatus
  metricsUpdatedAt?: DateTimeString
}

// ── Search ──────────────────────────────────────────────────────────────

export type SearchResultType = "post" | "media" | "account"
export type SearchResult = { type: SearchResultType; id: string; label: string; hint: string; href: string }
export type SearchParams = { q: string; types?: SearchResultType[]; limit?: number }
