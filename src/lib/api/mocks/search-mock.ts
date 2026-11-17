import { postStatusLabel } from "@/lib/format"
import { workspaceFor } from "@/lib/api/mocks/db"
import { fail, includesText, respond } from "@/lib/api/mocks/util"
import type { SearchService } from "@/lib/api/services/search-service"
import type { SearchResult } from "@/lib/api/types"

/** Mirrors the gateway: query posts, media and accounts, then merge. */
export const searchMock: SearchService = {
  async search(id, { q, types = ["post", "media", "account"], limit = 8 }) {
    if (!q.trim()) return fail("BAD_REQUEST", "Enter something to search for.")
    const { data } = await workspaceFor(id)
    const folder = (fid: string | null) => data.folders.find((f) => f.id === fid)?.name ?? "Library"
    const results: SearchResult[] = [
      ...(types.includes("post")
        ? data.posts
            .filter((p) => includesText(p.title, q))
            .map((p) => ({ type: "post" as const, id: p.id, label: p.title, hint: `Post · ${postStatusLabel[p.status]}`, href: `/posts/${p.id}` }))
        : []),
      ...(types.includes("media")
        ? data.media
            .filter((m) => includesText(m.name, q))
            .map((m) => ({ type: "media" as const, id: m.id, label: m.name, hint: `Media · ${folder(m.folderId)}`, href: "/media" }))
        : []),
      ...(types.includes("account")
        ? data.accounts
            .filter((a) => includesText(`${a.displayName} ${a.handle}`, q))
            .map((a) => ({ type: "account" as const, id: a.id, label: a.displayName, hint: `Account · ${a.accountType}`, href: "/accounts" }))
        : []),
    ]
    return respond({ data: results.slice(0, limit) })
  },
}
