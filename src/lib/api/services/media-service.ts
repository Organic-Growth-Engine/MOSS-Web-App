/** media-service: library, folders, uploads, storage. */
import { apiConfig } from "@/lib/api/config"
import { ApiError } from "@/lib/api/errors"
import { http, path } from "@/lib/api/http"
import { mediaMock } from "@/lib/api/mocks/media-mock"
import type {
  CreateFolderRequest,
  CreateUploadRequest,
  ListMediaParams,
  MediaAsset,
  MediaFolder,
  MediaFolderList,
  Page,
  StorageUsage,
  UpdateMediaRequest,
  UploadTicket,
} from "@/lib/api/types"

export interface MediaService {
  /** GET /workspaces/{workspaceId}/media */
  listMedia(workspaceId: string, params?: ListMediaParams): Promise<Page<MediaAsset>>
  /** GET /workspaces/{workspaceId}/media/storage */
  getStorageUsage(workspaceId: string): Promise<StorageUsage>
  /** POST /workspaces/{workspaceId}/media/uploads */
  createUpload(workspaceId: string, body: CreateUploadRequest): Promise<UploadTicket>
  /** POST /workspaces/{workspaceId}/media/uploads/{uploadId}/complete */
  completeUpload(workspaceId: string, uploadId: string): Promise<MediaAsset>
  /** GET /workspaces/{workspaceId}/media/{mediaId} */
  getMedia(workspaceId: string, mediaId: string): Promise<MediaAsset>
  /** PATCH /workspaces/{workspaceId}/media/{mediaId} */
  updateMedia(workspaceId: string, mediaId: string, body: UpdateMediaRequest): Promise<MediaAsset>
  /** DELETE /workspaces/{workspaceId}/media/{mediaId} */
  deleteMedia(workspaceId: string, mediaId: string): Promise<void>
  /** GET /workspaces/{workspaceId}/media-folders */
  listMediaFolders(workspaceId: string): Promise<MediaFolderList>
  /** POST /workspaces/{workspaceId}/media-folders */
  createMediaFolder(workspaceId: string, body: CreateFolderRequest): Promise<MediaFolder>
}

const S = "media" as const

const mediaApi: MediaService = {
  listMedia: (id, params = {}) => http.get(S, path`/workspaces/${id}/media`, { query: params }),
  getStorageUsage: (id) => http.get(S, path`/workspaces/${id}/media/storage`),
  createUpload: (id, body) => http.post(S, path`/workspaces/${id}/media/uploads`, { body }),
  completeUpload: (id, uploadId) => http.post(S, path`/workspaces/${id}/media/uploads/${uploadId}/complete`),
  getMedia: (id, mediaId) => http.get(S, path`/workspaces/${id}/media/${mediaId}`),
  updateMedia: (id, mediaId, body) => http.patch(S, path`/workspaces/${id}/media/${mediaId}`, { body }),
  deleteMedia: (id, mediaId) =>
    http.delete(S, path`/workspaces/${id}/media/${mediaId}`, { responseType: "none" }),
  listMediaFolders: (id) => http.get(S, path`/workspaces/${id}/media-folders`),
  createMediaFolder: (id, body) => http.post(S, path`/workspaces/${id}/media-folders`, { body }),
}

export const mediaService: MediaService = apiConfig.useMock.media ? mediaMock : mediaApi

/**
 * Upload flow (not an endpoint of its own): createUpload → PUT the file to the presigned URL
 * → completeUpload. Mock tickets use a `mock://` URL, so the PUT is skipped.
 */
export async function uploadFile(workspaceId: string, file: File, folderId?: string | null) {
  const ticket = await mediaService.createUpload(workspaceId, {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    folderId: folderId ?? null,
  })
  if (!ticket.uploadUrl.startsWith("mock://")) {
    const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file })
    if (!res.ok)
      throw new ApiError({ status: res.status, code: "INTERNAL", message: "The upload didn't finish. Please try again." })
  }
  return mediaService.completeUpload(workspaceId, ticket.uploadId)
}
