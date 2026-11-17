import { db, workspaceFor, type WorkspaceData } from "@/lib/api/mocks/db"
import { storage as fixtureStorage } from "@/lib/api/mocks/fixtures"
import { fail, includesText, newId, paginate, respond } from "@/lib/api/mocks/util"
import type { MediaService } from "@/lib/api/services/media-service"
import type { MediaAsset, MediaFormat } from "@/lib/api/types"

const formatFor: Record<string, MediaFormat> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov",
}

/** Usage is derived from posts, the way media-service would read it from content events. */
function withUsage(data: WorkspaceData, asset: MediaAsset): MediaAsset {
  const postIds = data.posts
    .filter((p) => p.status === "scheduled" && p.media.some((m) => m.id === asset.id))
    .map((p) => p.id)
  return { ...asset, usage: { scheduledPostCount: postIds.length, postIds } }
}

function storageFor(data: WorkspaceData) {
  if (data.workspace.id === "ws_studio_north") {
    const added = data.media.filter((m) => m.id.startsWith("med_up_")).reduce((s, m) => s + m.sizeBytes, 0)
    return { ...fixtureStorage, usedBytes: fixtureStorage.usedBytes + added }
  }
  return { ...fixtureStorage, usedBytes: data.media.reduce((s, m) => s + m.sizeBytes, 0) }
}

export const mediaMock: MediaService = {
  async listMedia(id, { folderId, kind, q, sort = "-createdAt", page, pageSize } = {}) {
    const { data } = await workspaceFor(id)
    const dir = sort.startsWith("-") ? -1 : 1
    const items = data.media
      .filter((m) => (!folderId || m.folderId === folderId) && (!kind || m.kind === kind) && includesText(m.name, q))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir)
      .map((m) => withUsage(data, m))
    return respond(paginate(items, page, pageSize))
  },

  async getStorageUsage(id) {
    const { data } = await workspaceFor(id)
    return respond(storageFor(data))
  },

  async createUpload(id, { fileName, contentType, sizeBytes, folderId }) {
    const { data } = await workspaceFor(id, "editor")
    const limits = storageFor(data)
    if (!formatFor[contentType])
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "contentType", message: "Use JPG, PNG, WEBP, MP4 or MOV." }])
    if (sizeBytes > limits.maxFileBytes)
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "sizeBytes", message: "Files can be up to 1 GB." }])
    if (limits.usedBytes + sizeBytes > limits.limitBytes) return fail("CONFLICT", "Your media storage is full.")
    const uploadId = newId("upl")
    db.uploads.set(uploadId, { fileName, contentType, sizeBytes, folderId: folderId ?? null })
    return respond({
      uploadId,
      uploadUrl: `mock://uploads/${uploadId}`,
      method: "PUT" as const,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    })
  },

  async completeUpload(id, uploadId) {
    const { data, user } = await workspaceFor(id, "editor")
    const upload = db.uploads.get(uploadId)
    if (!upload) return fail("NOT_FOUND", "Upload not found.")
    db.uploads.delete(uploadId)
    const format = formatFor[upload.contentType]
    const video = format === "mp4" || format === "mov"
    const asset: MediaAsset = {
      id: `med_up_${uploadId.slice(4)}`,
      name: upload.fileName,
      kind: video ? "video" : "image",
      format,
      mimeType: upload.contentType,
      sizeBytes: upload.sizeBytes,
      durationSeconds: video ? 24 : null,
      width: video ? 1080 : 2400,
      height: video ? 1920 : 3000,
      folderId: upload.folderId,
      url: `https://media.origin.example/${id}/${upload.fileName}`,
      thumbnailUrl: null,
      status: "ready",
      usage: { scheduledPostCount: 0, postIds: [] },
      createdBy: { userId: user.id, name: user.name },
      createdAt: new Date().toISOString(),
    }
    data.media.unshift(asset)
    return respond(asset)
  },

  async getMedia(id, mediaId) {
    const { data } = await workspaceFor(id)
    const asset = data.media.find((m) => m.id === mediaId)
    return asset ? respond(withUsage(data, asset)) : fail("NOT_FOUND", "Media not found.")
  },

  async updateMedia(id, mediaId, { name, folderId }) {
    const { data } = await workspaceFor(id, "editor")
    const asset = data.media.find((m) => m.id === mediaId)
    if (!asset) return fail("NOT_FOUND", "Media not found.")
    if (name !== undefined && !name.trim())
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "name", message: "Enter a file name." }])
    if (folderId && !data.folders.some((f) => f.id === folderId))
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "folderId", message: "That folder doesn't exist." }])
    if (name !== undefined) asset.name = name.trim()
    if (folderId !== undefined) asset.folderId = folderId
    return respond(withUsage(data, asset))
  },

  async deleteMedia(id, mediaId) {
    const { data } = await workspaceFor(id, "editor")
    const asset = data.media.find((m) => m.id === mediaId)
    if (!asset) return fail("NOT_FOUND", "Media not found.")
    const inUse = data.posts.filter(
      (p) => (p.status === "draft" || p.status === "scheduled") && p.media.some((m) => m.id === mediaId)
    ).length
    if (inUse) return fail("CONFLICT", `This file is used in ${inUse} draft or scheduled post${inUse === 1 ? "" : "s"}. Remove it there first.`)
    data.media = data.media.filter((m) => m.id !== mediaId)
    return respond(undefined)
  },

  async listMediaFolders(id) {
    const { data } = await workspaceFor(id)
    return respond({
      data: data.folders.map((f) => ({ ...f, assetCount: data.media.filter((m) => m.folderId === f.id).length })),
      meta: { totalAssets: data.media.length },
    })
  },

  async createMediaFolder(id, { name }) {
    const { data } = await workspaceFor(id, "editor")
    if (!name.trim()) return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "name", message: "Name your folder." }])
    if (data.folders.some((f) => f.name.toLowerCase() === name.trim().toLowerCase()))
      return fail("CONFLICT", "A folder with this name already exists.")
    const folder = { id: newId("fld"), name: name.trim() }
    data.folders.push(folder)
    return respond({ ...folder, assetCount: 0 })
  },
}
