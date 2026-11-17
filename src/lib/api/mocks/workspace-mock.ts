import { currentUser, db, emptyWorkspace, workspaceFor } from "@/lib/api/mocks/db"
import { fail, initialsOf, newId, paginate, respond } from "@/lib/api/mocks/util"
import type { WorkspaceService } from "@/lib/api/services/workspace-service"
import type { Workspace } from "@/lib/api/types"

const withSep = (url: string, qs: string) => `${url}${url.includes("?") ? "&" : "?"}${qs}`

export const workspaceMock: WorkspaceService = {
  async listWorkspaces() {
    const user = await currentUser()
    const data = [...db.workspaces.values()].flatMap(({ workspace: w, members }) => {
      const m = members.find((x) => x.userId === user.id)
      return m ? [{ id: w.id, name: w.name, initials: w.initials, kind: w.kind, role: m.role }] : []
    })
    return respond({ data })
  },

  async createWorkspace({ name, timezone }) {
    const user = await currentUser()
    if (!name.trim()) return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "name", message: "Name your workspace." }])
    const ws: Workspace = {
      id: newId("ws"),
      name: name.trim(),
      initials: initialsOf(name),
      kind: "team",
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || newId("ws"),
      timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      plan: { name: "Starter", accountSlots: 5, seats: 1, extraSocialAccounts: 0 },
      seatsUsed: 1,
      createdAt: new Date().toISOString(),
    }
    db.workspaces.set(ws.id, emptyWorkspace(ws, user))
    return respond(ws)
  },

  async getWorkspace(id) {
    const { data } = await workspaceFor(id)
    return respond(data.workspace)
  },

  async updateWorkspace(id, body) {
    const { data } = await workspaceFor(id, "admin")
    if (body.name !== undefined && !body.name.trim())
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "name", message: "Name your workspace." }])
    if (body.slug !== undefined) {
      if (!/^[a-z0-9-]{3,40}$/.test(body.slug))
        return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "slug", message: "Use 3–40 lowercase letters, numbers or dashes." }])
      if ([...db.workspaces.values()].some((w) => w.workspace.id !== id && w.workspace.slug === body.slug))
        return fail("CONFLICT", "That workspace URL is taken.")
    }
    Object.assign(data.workspace, body, body.name ? { initials: initialsOf(body.name) } : {})
    return respond(data.workspace)
  },

  async listMembers(id, { page, pageSize, sort = "joinedAt" } = {}) {
    const { data } = await workspaceFor(id)
    const key = sort.replace("-", "") as "name" | "joinedAt"
    const dir = sort.startsWith("-") ? -1 : 1
    const sorted = [...data.members].sort((a, b) => a[key].localeCompare(b[key]) * dir)
    return respond(paginate(sorted, page, pageSize))
  },

  async updateMember(id, userId, { role }) {
    const { data, member: caller } = await workspaceFor(id, "admin")
    const member = data.members.find((m) => m.userId === userId)
    if (!member) return fail("NOT_FOUND", "Member not found.")
    if ((role === "owner" || member.role === "owner") && caller.role !== "owner")
      return fail("FORBIDDEN", "Only owners can change the owner role.")
    if (member.role === "owner" && role !== "owner" && data.members.filter((m) => m.role === "owner").length === 1)
      return fail("CONFLICT", "A workspace needs at least one owner.")
    member.role = role
    return respond(member)
  },

  async createInvitation(id, { email, role }) {
    const { data, user } = await workspaceFor(id, "admin")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "email", message: "Enter a valid email address." }])
    if (data.members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
      return fail("CONFLICT", "This person is already a member.")
    const pending = data.invitations.filter((i) => i.status === "pending").length
    if (data.members.length + pending >= data.workspace.plan.seats)
      return fail("PLAN_LIMIT_REACHED", "All seats on your plan are taken.")
    const invitation = {
      id: newId("inv"),
      email,
      role,
      status: "pending" as const,
      invitedBy: { userId: user.id, name: user.name },
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    }
    data.invitations.push(invitation)
    db.invitationTokens[newId("inv_tk")] = { invitation, workspaceId: id, userExists: false }
    return respond(invitation)
  },

  async createBillingPortalSession(id, { returnUrl }) {
    await workspaceFor(id, "owner")
    return respond({ url: withSep(returnUrl, "billing=mock_portal") })
  },

  async createCheckoutSession(id, { successUrl }) {
    const { data } = await workspaceFor(id, "owner")
    // Mock checkout "succeeds" instantly.
    data.workspace.plan.extraSocialAccounts += 1
    return respond({ url: successUrl })
  },
}
