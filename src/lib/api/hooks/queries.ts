"use client"

/**
 * TanStack Query hooks over the service modules. Query keys start with
 * [service, workspaceId, …] so a mutation can invalidate everything a service owns.
 */
import { useEffect, useRef } from "react"
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { meKey, useWorkspaceId } from "@/lib/api/hooks/workspace-context"
import { accountsService } from "@/lib/api/services/accounts-service"
import { analyticsService } from "@/lib/api/services/analytics-service"
import { contentService } from "@/lib/api/services/content-service"
import { identityService } from "@/lib/api/services/identity-service"
import { mediaService, uploadFile } from "@/lib/api/services/media-service"
import { notificationService } from "@/lib/api/services/notification-service"
import { searchService } from "@/lib/api/services/search-service"
import { workspaceService } from "@/lib/api/services/workspace-service"
import type {
  AnalyticsRangeParams,
  CalendarParams,
  DateRange,
  ListMediaParams,
  ListPostsParams,
  PostCountsParams,
  TimeseriesParams,
} from "@/lib/api/types"

type Service = "workspace" | "accounts" | "content" | "media" | "analytics" | "notifications" | "search"

type Freshness = { refetchInterval?: number; refetchOnWindowFocus?: boolean }

/**
 * Metrics arrive as the platforms report them; the event stream's `metrics.updated` triggers an
 * immediate refetch. This interval is only a safety net if the stream is down.
 */
const ANALYTICS_REFRESH: Freshness = { refetchInterval: 5 * 60_000, refetchOnWindowFocus: true }

function useWsQuery<T>(
  service: Service,
  key: unknown[],
  fn: (workspaceId: string) => Promise<T>,
  enabled = true,
  freshness: Freshness = {}
) {
  const id = useWorkspaceId()
  return useQuery({
    queryKey: [service, id, ...key],
    queryFn: () => fn(id!),
    enabled: Boolean(id) && enabled,
    placeholderData: keepPreviousData,
    ...freshness,
  })
}

/** Mutation scoped to the current workspace that refreshes the listed services afterwards. */
function useWsMutation<V, T>(fn: (workspaceId: string, vars: V) => Promise<T>, invalidates: Service[]) {
  const id = useWorkspaceId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: V) => fn(id!, vars),
    onSettled: () =>
      Promise.all(invalidates.map((s) => qc.invalidateQueries({ queryKey: [s, id] as QueryKey }))),
  })
}

// ── Identity ────────────────────────────────────────────────────────────

export const useAuthProviders = () =>
  useQuery({ queryKey: ["identity", "providers"], queryFn: () => identityService.listAuthProviders() })

export const useSecurityOverview = () =>
  useQuery({ queryKey: ["identity", "security"], queryFn: () => identityService.getSecurityOverview() })

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: identityService.revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["identity", "security"] }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: identityService.updateCurrentUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: meKey }),
  })
}

// ── Workspace ───────────────────────────────────────────────────────────

export const useWorkspaces = () =>
  useQuery({ queryKey: ["workspace", "list"], queryFn: () => workspaceService.listWorkspaces() })

export const useMembers = () =>
  useWsQuery("workspace", ["members"], (id) => workspaceService.listMembers(id, { pageSize: 100 }))

export const useUpdateWorkspace = () =>
  useWsMutation(workspaceService.updateWorkspace, ["workspace"])

export const useUpdateMember = () =>
  useWsMutation((id, v: { userId: string; role: Parameters<typeof workspaceService.updateMember>[2]["role"] }) =>
    workspaceService.updateMember(id, v.userId, { role: v.role }), ["workspace"])

export const useCreateInvitation = () => useWsMutation(workspaceService.createInvitation, ["workspace"])
export const useBillingPortal = () => useWsMutation(workspaceService.createBillingPortalSession, [])
export const useCheckout = () => useWsMutation(workspaceService.createCheckoutSession, ["workspace"])

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["workspace", "list"] }),
        qc.invalidateQueries({ queryKey: meKey }),
      ]),
  })
}

// ── Accounts ────────────────────────────────────────────────────────────

export const useSocialAccounts = () =>
  useWsQuery("accounts", ["list"], (id) => accountsService.listSocialAccounts(id))

export const useSocialAccount = (accountId: string | null) =>
  useWsQuery("accounts", ["detail", accountId], (id) => accountsService.getSocialAccount(id, accountId!), Boolean(accountId))

export const useStartConnection = () => useWsMutation(accountsService.startConnection, ["accounts"])

export const useReconnect = () =>
  useWsMutation((id, v: { accountId: string; redirectUri: string }) =>
    accountsService.reconnect(id, v.accountId, { redirectUri: v.redirectUri }), ["accounts", "content"])

export const useDisconnect = () =>
  useWsMutation((id, accountId: string) => accountsService.disconnect(id, accountId), ["accounts"])

// ── Content ─────────────────────────────────────────────────────────────

export const usePosts = (params: ListPostsParams, enabled = true) =>
  useWsQuery("content", ["posts", params], (id) => contentService.listPosts(id, params), enabled)

export const usePostCounts = (params: PostCountsParams = {}) =>
  useWsQuery("content", ["counts", params], (id) => contentService.getPostCounts(id, params))

export const usePublishingStats = (range: DateRange) =>
  useWsQuery("content", ["publishing-stats", range], (id) => contentService.getPublishingStats(id, range))

export function usePost(postId: string | null) {
  const id = useWorkspaceId()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ["content", id, "post", postId],
    queryFn: () => contentService.getPost(id!, postId!),
    enabled: Boolean(id && postId),
    // While destinations are still publishing, poll until they settle.
    refetchInterval: (q) => (q.state.data?.status === "publishing" ? 1500 : false),
  })
  // Once publishing settles, lists, counts, calendar and notifications are out of date.
  const status = query.data?.status
  const wasPublishing = useRef(false)
  useEffect(() => {
    if (status === "publishing") wasPublishing.current = true
    else if (status && wasPublishing.current) {
      wasPublishing.current = false
      qc.invalidateQueries({ queryKey: ["content", id] })
      qc.invalidateQueries({ queryKey: ["notifications", id] })
    }
  }, [status, id, qc])
  return query
}

export const useCalendar = (params: CalendarParams) =>
  useWsQuery("content", ["calendar", params], (id) => contentService.getCalendar(id, params))

const contentAndMedia: Service[] = ["content", "media"]
export const useCreatePost = () => useWsMutation(contentService.createPost, contentAndMedia)
export const useUpdatePost = () =>
  useWsMutation((id, v: { postId: string; body: Parameters<typeof contentService.updatePost>[2] }) =>
    contentService.updatePost(id, v.postId, v.body), contentAndMedia)
export const useDeletePost = () => useWsMutation(contentService.deletePost, contentAndMedia)
export const useSchedulePost = () =>
  useWsMutation((id, v: { postId: string; publishAt: string }) =>
    contentService.schedulePost(id, v.postId, { publishAt: v.publishAt }), contentAndMedia)
export const usePublishPost = () => useWsMutation(contentService.publishPost, [...contentAndMedia, "notifications"])
export const useDuplicatePost = () => useWsMutation(contentService.duplicatePost, ["content"])
export const useRetryDestination = () =>
  useWsMutation((id, v: { postId: string; destinationId: string }) =>
    contentService.retryDestination(id, v.postId, v.destinationId), ["content", "notifications"])
export const useSuggestHashtags = () => useWsMutation(contentService.suggestHashtags, [])

// ── Media ───────────────────────────────────────────────────────────────

export function useMediaInfinite(params: Omit<ListMediaParams, "page">) {
  const id = useWorkspaceId()
  return useInfiniteQuery({
    queryKey: ["media", id, "list", params],
    queryFn: ({ pageParam }) => mediaService.listMedia(id!, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled: Boolean(id),
  })
}

export const useMediaList = (params: ListMediaParams, enabled = true) =>
  useWsQuery("media", ["page", params], (id) => mediaService.listMedia(id, params), enabled)

export const useMediaAsset = (mediaId: string | null) =>
  useWsQuery("media", ["detail", mediaId], (id) => mediaService.getMedia(id, mediaId!), Boolean(mediaId))

export const useMediaFolders = () => useWsQuery("media", ["folders"], (id) => mediaService.listMediaFolders(id))
export const useStorageUsage = () => useWsQuery("media", ["storage"], (id) => mediaService.getStorageUsage(id))
export const useCreateFolder = () => useWsMutation(mediaService.createMediaFolder, ["media"])
export const useUpdateMedia = () =>
  useWsMutation((id, v: { mediaId: string; body: Parameters<typeof mediaService.updateMedia>[2] }) =>
    mediaService.updateMedia(id, v.mediaId, v.body), ["media"])
export const useDeleteMedia = () => useWsMutation(mediaService.deleteMedia, ["media"])
export const useUploadMedia = () =>
  useWsMutation((id, v: { file: File; folderId?: string | null }) => uploadFile(id, v.file, v.folderId), ["media"])

// ── Analytics ───────────────────────────────────────────────────────────

export const useAnalyticsOverview = (params: AnalyticsRangeParams) =>
  useWsQuery("analytics", ["overview", params], (id) => analyticsService.getOverview(id, params), true, ANALYTICS_REFRESH)
export const useTimeseries = (params: TimeseriesParams) =>
  useWsQuery("analytics", ["timeseries", params], (id) => analyticsService.getTimeseries(id, params), true, ANALYTICS_REFRESH)
export const usePlatformMetrics = (range: DateRange) =>
  useWsQuery("analytics", ["platforms", range], (id) => analyticsService.getPlatformMetrics(id, range), true, ANALYTICS_REFRESH)
export const useBestTimes = () => useWsQuery("analytics", ["best-times"], (id) => analyticsService.getBestTimes(id))

// ── Notifications ───────────────────────────────────────────────────────

export const useNotifications = () =>
  useWsQuery("notifications", ["list"], (id) => notificationService.listNotifications(id, { pageSize: 10 }))
export const useMarkNotificationRead = () => useWsMutation(notificationService.markRead, ["notifications"])
export const useNotificationPreferences = () =>
  useWsQuery("notifications", ["preferences"], (id) => notificationService.getPreferences(id))
export const useUpdateNotificationPreferences = () =>
  useWsMutation(notificationService.updatePreferences, ["notifications"])

// ── Search ──────────────────────────────────────────────────────────────

export const useSearch = (q: string) =>
  useWsQuery("search", [q], (id) => searchService.search(id, { q, limit: 8 }), q.trim().length > 0)
