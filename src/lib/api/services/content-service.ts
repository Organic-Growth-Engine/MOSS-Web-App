/** content-service: posts, destinations, publishing, calendar, hashtag suggestions, exports. */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { contentMock } from "@/lib/api/mocks/content-mock"
import type {
  CalendarEntry,
  CalendarParams,
  DateRange,
  ExportFormat,
  HashtagSuggestionRequest,
  HashtagSuggestions,
  List,
  ListPostsParams,
  Page,
  Post,
  PostCounts,
  PostCountsParams,
  PostFilters,
  PostInput,
  PublishingStats,
  SchedulePostRequest,
  UpdatePostRequest,
} from "@/lib/api/types"

export interface ContentService {
  /** GET /workspaces/{workspaceId}/posts */
  listPosts(workspaceId: string, params?: ListPostsParams): Promise<Page<Post>>
  /** GET /workspaces/{workspaceId}/posts/counts */
  getPostCounts(workspaceId: string, params?: PostCountsParams): Promise<PostCounts>
  /** GET /workspaces/{workspaceId}/posts/publishing-stats */
  getPublishingStats(workspaceId: string, range: DateRange): Promise<PublishingStats>
  /** GET /workspaces/{workspaceId}/posts/export */
  exportPosts(workspaceId: string, format: ExportFormat, filters?: PostFilters): Promise<Blob>
  /** POST /workspaces/{workspaceId}/posts/hashtag-suggestions */
  suggestHashtags(workspaceId: string, body: HashtagSuggestionRequest): Promise<HashtagSuggestions>
  /** GET /workspaces/{workspaceId}/posts/{postId} */
  getPost(workspaceId: string, postId: string): Promise<Post>
  /** POST /workspaces/{workspaceId}/posts */
  createPost(workspaceId: string, body: PostInput): Promise<Post>
  /** PATCH /workspaces/{workspaceId}/posts/{postId} */
  updatePost(workspaceId: string, postId: string, body: UpdatePostRequest): Promise<Post>
  /** DELETE /workspaces/{workspaceId}/posts/{postId} */
  deletePost(workspaceId: string, postId: string): Promise<void>
  /** POST /workspaces/{workspaceId}/posts/{postId}/schedule */
  schedulePost(workspaceId: string, postId: string, body: SchedulePostRequest): Promise<Post>
  /** POST /workspaces/{workspaceId}/posts/{postId}/publish */
  publishPost(workspaceId: string, postId: string): Promise<Post>
  /** POST /workspaces/{workspaceId}/posts/{postId}/duplicate */
  duplicatePost(workspaceId: string, postId: string): Promise<Post>
  /** POST /workspaces/{workspaceId}/posts/{postId}/destinations/{destinationId}/retry */
  retryDestination(workspaceId: string, postId: string, destinationId: string): Promise<Post>
  /** GET /workspaces/{workspaceId}/calendar */
  getCalendar(workspaceId: string, params: CalendarParams): Promise<List<CalendarEntry>>
}

const S = "content" as const

const contentApi: ContentService = {
  listPosts: (id, params = {}) => http.get(S, path`/workspaces/${id}/posts`, { query: params }),
  getPostCounts: (id, params = {}) => http.get(S, path`/workspaces/${id}/posts/counts`, { query: params }),
  getPublishingStats: (id, range) =>
    http.get(S, path`/workspaces/${id}/posts/publishing-stats`, { query: range }),
  exportPosts: (id, format, filters = {}) =>
    http.get(S, path`/workspaces/${id}/posts/export`, { query: { format, ...filters }, responseType: "blob" }),
  suggestHashtags: (id, body) => http.post(S, path`/workspaces/${id}/posts/hashtag-suggestions`, { body }),
  getPost: (id, postId) => http.get(S, path`/workspaces/${id}/posts/${postId}`),
  createPost: (id, body) => http.post(S, path`/workspaces/${id}/posts`, { body }),
  updatePost: (id, postId, body) => http.patch(S, path`/workspaces/${id}/posts/${postId}`, { body }),
  deletePost: (id, postId) =>
    http.delete(S, path`/workspaces/${id}/posts/${postId}`, { responseType: "none" }),
  schedulePost: (id, postId, body) => http.post(S, path`/workspaces/${id}/posts/${postId}/schedule`, { body }),
  publishPost: (id, postId) => http.post(S, path`/workspaces/${id}/posts/${postId}/publish`),
  duplicatePost: (id, postId) => http.post(S, path`/workspaces/${id}/posts/${postId}/duplicate`),
  retryDestination: (id, postId, destinationId) =>
    http.post(S, path`/workspaces/${id}/posts/${postId}/destinations/${destinationId}/retry`),
  getCalendar: (id, params) => http.get(S, path`/workspaces/${id}/calendar`, { query: params }),
}

export const contentService: ContentService = apiConfig.useMock.content ? contentMock : contentApi
