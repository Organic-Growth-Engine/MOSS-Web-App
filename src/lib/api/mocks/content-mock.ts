import { now } from "@/lib/clock"
import { dateKeyInTz, daysBetween, formatInTz, postStatusLabel } from "@/lib/format"
import { workspaceFor, type WorkspaceData } from "@/lib/api/mocks/db"
import { emit } from "@/lib/api/mocks/events"
import { csv, fail, includesText, newId, paginate, respond, textPdf } from "@/lib/api/mocks/util"
import type { ContentService } from "@/lib/api/services/content-service"
import type {
  Destination,
  DestinationInput,
  ListPostsParams,
  MediaRef,
  Notification,
  Post,
  PostFilters,
  PostStatus,
} from "@/lib/api/types"
import { platformMeta } from "@/config/platforms"

const editable: PostStatus[] = ["draft", "scheduled"]

function inRange(data: WorkspaceData, iso: string | null | undefined, from?: string, to?: string) {
  if (!from && !to) return true
  if (!iso) return false
  const key = dateKeyInTz(iso, data.workspace.timezone)
  return (!from || key >= from) && (!to || key <= to)
}

function filterPosts(data: WorkspaceData, f: PostFilters) {
  return data.posts.filter(
    (p) =>
      (!f.status?.length || f.status.includes(p.status)) &&
      (!f.platform || p.destinations.some((d) => d.platform === f.platform)) &&
      includesText(`${p.title} ${p.caption}`, f.q) &&
      inRange(data, p.publishAt, f.from, f.to)
  )
}

function sortPosts(posts: Post[], sort: NonNullable<ListPostsParams["sort"]> = "-publishAt") {
  const dir = sort.startsWith("-") ? -1 : 1
  const key = sort.replace("-", "") as "publishAt" | "updatedAt"
  return [...posts].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    // Posts without publishAt always come last, most recently edited first.
    if (!av || !bv) return av ? -1 : bv ? 1 : b.updatedAt.localeCompare(a.updatedAt)
    return av.localeCompare(bv) * dir
  })
}

async function getOwnPost(workspaceId: string, postId: string) {
  const ctx = await workspaceFor(workspaceId)
  const post = ctx.data.posts.find((p) => p.id === postId)
  if (!post) return fail("NOT_FOUND", "Post not found.")
  return { ...ctx, post }
}

function resolveMedia(data: WorkspaceData, ids: string[]): MediaRef[] | null {
  const refs = ids.map((id) => data.media.find((m) => m.id === id))
  if (refs.some((m) => !m)) return null
  return refs.map((m) => ({
    id: m!.id, name: m!.name, kind: m!.kind, format: m!.format, sizeBytes: m!.sizeBytes,
    durationSeconds: m!.durationSeconds, width: m!.width, height: m!.height, thumbnailUrl: m!.thumbnailUrl,
  }))
}

/** Destinations go to each platform's default (locked) account. */
function resolveDestinations(
  data: WorkspaceData, inputs: DestinationInput[], status: Destination["status"], previous: Destination[] = []
): Destination[] | string {
  const out: Destination[] = []
  for (const input of inputs) {
    const account = data.accounts.find((a) => a.platform === input.platform && a.isDefault)
    if (!account) return `Connect a ${platformMeta[input.platform].name} account first.`
    const prev = previous.find((d) => d.platform === input.platform)
    out.push({
      id: prev?.id ?? newId("dst"),
      accountId: account.id,
      platform: input.platform,
      accountLabel: account.displayName,
      format: input.format,
      captionOverride: input.captionOverride ?? null,
      title: input.title ?? null,
      status,
      publishedAt: null,
      externalUrl: null,
      error: null,
    })
  }
  return out
}

function rollUp(post: Post) {
  const published = post.destinations.filter((d) => d.status === "published").length
  const pending = post.destinations.some((d) => d.status === "publishing")
  post.status = pending
    ? "publishing"
    : published === post.destinations.length
      ? "published"
      : published > 0
        ? "partially_published"
        : "failed"
}

/** Simulates the publisher worker: settles "publishing" destinations shortly after. */
function settleLater(data: WorkspaceData, post: Post) {
  setTimeout(() => {
    for (const d of post.destinations) {
      if (d.status !== "publishing") continue
      const account = data.accounts.find((a) => a.id === d.accountId)
      if (account && (account.status === "connected" || account.status === "expires_soon")) {
        Object.assign(d, { status: "published", publishedAt: new Date(now().getTime() + 3000).toISOString(), error: null })
      } else {
        const name = platformMeta[d.platform].name
        Object.assign(d, {
          status: "failed",
          error:
            account?.status === "expired"
              ? { code: "authorization_expired", title: "Authorization expired", detail: `No post was created on ${name}` }
              : { code: "account_not_connected", title: "Account not connected", detail: `Connect ${name} to publish here` },
        })
      }
    }
    rollUp(post)
    post.updatedAt = new Date().toISOString()
    const ok = post.destinations.filter((d) => d.status === "published").length
    const notification: Notification = {
      id: newId("ntf"),
      type: post.status === "published" ? "publish_succeeded" : post.status === "failed" ? "publish_failed" : "publish_partially_failed",
      severity: post.status === "published" ? "success" : post.status === "failed" ? "error" : "warning",
      title: post.title,
      detail: post.status === "published" ? `Published to ${ok} accounts · Just now` : `${ok} published · ${post.destinations.length - ok} need attention`,
      href: `/posts/${post.id}`,
      readAt: null,
      createdAt: new Date().toISOString(),
    }
    data.notifications.unshift(notification)
    emit(data.workspace.id, { type: "post.updated", postId: post.id, postStatus: post.status })
    emit(data.workspace.id, { type: "notification.created", notification })
  }, 1500)
}

function validationError(field: string, message: string) {
  return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field, message }])
}

export const contentMock: ContentService = {
  async listPosts(id, { page, pageSize, sort, ...filters } = {}) {
    const { data } = await workspaceFor(id)
    return respond(paginate(sortPosts(filterPosts(data, filters), sort), page, pageSize))
  },

  async getPostCounts(id, filters = {}) {
    const { data } = await workspaceFor(id)
    const posts = filterPosts(data, filters)
    const count = (s: PostStatus) => posts.filter((p) => p.status === s).length
    return respond({
      all: posts.length,
      draft: count("draft"),
      scheduled: count("scheduled"),
      publishing: count("publishing"),
      published: count("published"),
      partiallyPublished: count("partially_published"),
      failed: count("failed"),
    })
  },

  async getPublishingStats(id, { from, to }) {
    const { data } = await workspaceFor(id)
    const posts = filterPosts(data, { from, to, status: ["published", "partially_published"] })
    const destinations = filterPosts(data, { from, to }).flatMap((p) => p.destinations)
    const published = destinations.filter((d) => d.status === "published").length
    const failed = destinations.filter((d) => d.status === "failed").length
    return respond({
      // Counts posts, not destinations.
      postsPublished: posts.length,
      destinationSuccessRate: published + failed ? published / (published + failed) : 1,
      destinationsNeedingAttention: failed,
      connectedPlatforms: new Set(data.accounts.filter((a) => a.status !== "not_connected").map((a) => a.platform)).size,
    })
  },

  async exportPosts(id, format, filters = {}) {
    const { data } = await workspaceFor(id)
    const tz = data.workspace.timezone
    const rows = sortPosts(filterPosts(data, filters)).map((p) => [
      p.title,
      postStatusLabel[p.status],
      p.publishAt ? formatInTz(p.publishAt, tz, { dateStyle: "medium", timeStyle: "short" }) : "",
      p.destinations.map((d) => platformMeta[d.platform].name).join(" / "),
    ])
    const blob =
      format === "csv"
        ? csv([["Title", "Status", "Publish date", "Destinations"], ...rows])
        : textPdf([`${data.workspace.name} · Posts`, "", ...rows.map((r) => r.join("  ·  "))])
    return respond(blob)
  },

  async suggestHashtags(id, { caption }) {
    const { data } = await workspaceFor(id, "editor")
    if (!caption.trim()) return validationError("caption", "Write a caption first.")
    return respond({ hashtags: [`#${data.workspace.name.replace(/\s+/g, "")}`, "#RoomToGrow"] })
  },

  async getPost(id, postId) {
    const { post } = await getOwnPost(id, postId)
    return respond(post)
  },

  async createPost(id, body) {
    const { data, user } = await workspaceFor(id, "editor")
    if (!body.title?.trim()) return validationError("title", "Give this post a name.")
    const media = resolveMedia(data, body.mediaIds ?? [])
    if (!media) return validationError("mediaIds", "Some media no longer exists.")
    const destinations = resolveDestinations(data, body.destinations ?? [], "queued")
    if (typeof destinations === "string") return validationError("destinations", destinations)
    const at = new Date().toISOString()
    const post: Post = {
      id: newId("post"),
      title: body.title.trim(),
      caption: body.caption ?? "",
      link: body.link ?? null,
      media,
      mediaType: media[0]?.kind ?? null,
      status: "draft",
      publishAt: body.publishAt ?? null,
      createdBy: { userId: user.id, name: user.name },
      createdAt: at,
      updatedAt: at,
      destinations,
    }
    data.posts.unshift(post)
    return respond(post)
  },

  async updatePost(id, postId, body) {
    const { data, post } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    if (!editable.includes(post.status)) return fail("INVALID_STATE", `${postStatusLabel[post.status]} posts can't be edited.`)
    if (body.title !== undefined && !body.title.trim()) return validationError("title", "Give this post a name.")
    if (body.mediaIds) {
      const media = resolveMedia(data, body.mediaIds)
      if (!media) return validationError("mediaIds", "Some media no longer exists.")
      post.media = media
      post.mediaType = media[0]?.kind ?? null
    }
    if (body.destinations) {
      const destinations = resolveDestinations(
        data, body.destinations, post.status === "scheduled" ? "scheduled" : "queued", post.destinations
      )
      if (typeof destinations === "string") return validationError("destinations", destinations)
      if (post.status === "scheduled" && destinations.length === 0)
        return validationError("destinations", "A scheduled post needs at least one destination.")
      post.destinations = destinations
    }
    const { title, caption, link, publishAt } = body
    Object.assign(
      post,
      title !== undefined && { title: title.trim() },
      caption !== undefined && { caption },
      link !== undefined && { link },
      publishAt !== undefined && { publishAt },
      { updatedAt: new Date().toISOString() }
    )
    return respond(post)
  },

  async deletePost(id, postId) {
    const { data, post } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    if (post.status === "publishing") return fail("INVALID_STATE", "This post is publishing right now. Try again in a moment.")
    data.posts = data.posts.filter((p) => p.id !== postId)
    return respond(undefined)
  },

  async schedulePost(id, postId, { publishAt }) {
    const { post } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    if (!editable.includes(post.status)) return fail("INVALID_STATE", `${postStatusLabel[post.status]} posts can't be rescheduled.`)
    if (!post.destinations.length) return validationError("destinations", "Choose at least one destination.")
    if (new Date(publishAt).getTime() <= now().getTime()) return validationError("publishAt", "Choose a time in the future.")
    Object.assign(post, { status: "scheduled", publishAt, updatedAt: new Date().toISOString() })
    post.destinations.forEach((d) => (d.status = "scheduled"))
    return respond(post)
  },

  async publishPost(id, postId) {
    const { data, post } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    if (!editable.includes(post.status)) return fail("INVALID_STATE", `${postStatusLabel[post.status]} posts can't be published again.`)
    if (!post.destinations.length) return validationError("destinations", "Choose at least one destination.")
    Object.assign(post, { status: "publishing", publishAt: now().toISOString(), updatedAt: new Date().toISOString() })
    post.destinations.forEach((d) => (d.status = "publishing"))
    settleLater(data, post)
    return respond(post)
  },

  async duplicatePost(id, postId) {
    const { data, post, user } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    const at = new Date().toISOString()
    const copy: Post = {
      ...structuredClone(post),
      id: newId("post"),
      title: `${post.title} (copy)`,
      status: "draft",
      publishAt: null,
      createdBy: { userId: user.id, name: user.name },
      createdAt: at,
      updatedAt: at,
    }
    copy.destinations = copy.destinations.map((d) => ({
      ...d, id: newId("dst"), status: "queued", publishedAt: null, externalUrl: null, error: null,
    }))
    data.posts.unshift(copy)
    return respond(copy)
  },

  async retryDestination(id, postId, destinationId) {
    const { data, post } = await getOwnPost(id, postId)
    await workspaceFor(id, "editor")
    const destination = post.destinations.find((d) => d.id === destinationId)
    if (!destination) return fail("NOT_FOUND", "Destination not found.")
    if (destination.status !== "failed") return fail("INVALID_STATE", "Only failed destinations can be retried.")
    const account = data.accounts.find((a) => a.id === destination.accountId)
    if (!account || account.status === "expired" || account.status === "not_connected")
      return validationError("destinationId", `Reconnect ${platformMeta[destination.platform].name} first, then retry.`)
    Object.assign(destination, { status: "publishing", error: null })
    rollUp(post)
    settleLater(data, post)
    return respond(post)
  },

  async getCalendar(id, { from, to, platform }) {
    const { data } = await workspaceFor(id)
    if (daysBetween(from, to) > 62 || daysBetween(from, to) < 0)
      return fail("BAD_REQUEST", "The calendar range must be between 1 and 62 days.")
    const entries = sortPosts(filterPosts(data, { from, to, platform }), "publishAt").map((p) => ({
      postId: p.id,
      title: p.title,
      publishAt: p.publishAt!,
      status: p.status,
      platforms: p.destinations.map((d) => d.platform),
      mediaType: p.mediaType,
    }))
    return respond({ data: entries })
  },
}

