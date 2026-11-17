import { db, emptyWorkspace, mockSession, rolesClaim, currentUser } from "@/lib/api/mocks/db"
import * as fx from "@/lib/api/mocks/fixtures"
import { fail, initialsOf, newId, respond } from "@/lib/api/mocks/util"
import type { IdentityService } from "@/lib/api/services/identity-service"
import type { TokenResponse, User } from "@/lib/api/types"

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")

/** Unsigned JWT-shaped token with the same claims identity-service issues. */
function tokenFor(user: User): TokenResponse {
  mockSession.signIn(user.id)
  const payload = {
    sub: user.id,
    email: user.email,
    workspaces: rolesClaim(user.id),
    exp: Math.floor(Date.now() / 1000) + 900,
  }
  return { accessToken: `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.mock`, tokenType: "Bearer", expiresIn: 900 }
}

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

function createUser(name: string, email: string, authProvider: User["authProvider"], password?: string): User {
  const user: User = {
    id: newId("usr"),
    name,
    initials: initialsOf(name),
    email,
    authProvider,
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  if (password) db.passwords.set(user.id, password)
  return user
}

export const identityMock: IdentityService = {
  listAuthProviders: () =>
    respond({
      data: [
        { id: "google", name: "Google", kind: "oauth" },
        { id: "password", name: "Email and password", kind: "password" },
      ],
    }),

  // Skips Google: lands straight back on the callback with a code, as Google would.
  authorizeUrl: ({ redirectUri, state }) =>
    `${redirectUri}?${new URLSearchParams({ code: "mock_google_code", state })}`,

  async exchangeToken(body) {
    if (body.grantType === "refresh_token") {
      const user = db.users.find((u) => u.id === mockSession.userId)
      if (!user) return fail("UNAUTHENTICATED", "Your session has expired. Please sign in again.")
      return respond(tokenFor(user))
    }
    if (body.code !== "mock_google_code") return fail("BAD_REQUEST", "This sign-in link is invalid or has expired.")
    // Mock Google always signs in as the workspace owner.
    return respond(tokenFor(db.users.find((u) => u.id === "usr_maya")!))
  },

  async loginWithPassword({ email, password }) {
    if (!validEmail(email)) return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "email", message: "Enter a valid email address." }])
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || db.passwords.get(user.id) !== password)
      return fail("UNAUTHENTICATED", "That email and password don't match.")
    return respond(tokenFor(user))
  },

  async signUp({ name, email, password, workspaceName }) {
    const details = [
      !name.trim() && { field: "name", message: "Enter your name." },
      !validEmail(email) && { field: "email", message: "Enter a valid email address." },
      password.length < 10 && { field: "password", message: "Use at least 10 characters." },
      !workspaceName.trim() && { field: "workspaceName", message: "Name your workspace." },
    ].filter((d): d is { field: string; message: string } => Boolean(d))
    if (details.length) return fail("VALIDATION_FAILED", "Some fields need attention.", details)
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return fail("CONFLICT", "An account with this email already exists. Sign in instead.")
    const user = createUser(name.trim(), email.trim(), "password", password)
    const ws = {
      id: newId("ws"),
      name: workspaceName.trim(),
      initials: initialsOf(workspaceName),
      kind: "team" as const,
      slug: workspaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      plan: { name: "Starter", accountSlots: 5, seats: 1, extraSocialAccounts: 0 },
      seatsUsed: 1,
      createdAt: user.createdAt,
    }
    db.workspaces.set(ws.id, emptyWorkspace(ws, user))
    return respond(tokenFor(user))
  },

  async requestPasswordReset({ email }) {
    if (!validEmail(email)) return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "email", message: "Enter a valid email address." }])
    return respond(undefined)
  },

  async confirmPasswordReset({ token, password }) {
    if (password.length < 10)
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "password", message: "Use at least 10 characters." }])
    if (token !== "reset_demo") return fail("BAD_REQUEST", "This reset link is invalid or has expired.")
    return respond(undefined)
  },

  async logout() {
    mockSession.signOut()
    return respond(undefined)
  },

  async getInvitation(token) {
    const entry = db.invitationTokens[token]
    if (!entry) return fail("NOT_FOUND", "This invitation doesn't exist.")
    if (entry.invitation.status !== "pending") return fail("CONFLICT", "This invitation has already been used.")
    const ws = db.workspaces.get(entry.workspaceId)!
    return respond({
      workspaceName: ws.workspace.name,
      email: entry.invitation.email,
      role: entry.invitation.role,
      invitedBy: entry.invitation.invitedBy,
      expiresAt: entry.invitation.expiresAt,
      userExists: db.users.some((u) => u.email === entry.invitation.email),
    })
  },

  async acceptInvitation(token, body) {
    const entry = db.invitationTokens[token]
    if (!entry) return fail("NOT_FOUND", "This invitation doesn't exist.")
    if (entry.invitation.status !== "pending") return fail("CONFLICT", "This invitation has already been used.")
    let user = db.users.find((u) => u.id === mockSession.userId)
    if (!user) {
      if (!body?.name?.trim() || !body.password || body.password.length < 10)
        return fail("VALIDATION_FAILED", "Some fields need attention.", [
          ...(!body?.name?.trim() ? [{ field: "name", message: "Enter your name." }] : []),
          ...(!body?.password || body.password.length < 10 ? [{ field: "password", message: "Use at least 10 characters." }] : []),
        ])
      user = createUser(body.name.trim(), entry.invitation.email, "password", body.password)
    }
    const ws = db.workspaces.get(entry.workspaceId)!
    if (!ws.members.some((m) => m.userId === user!.id)) {
      ws.members.push({
        userId: user.id, name: user.name, initials: user.initials, email: user.email,
        role: entry.invitation.role, joinedAt: new Date().toISOString(),
      })
      ws.workspace.seatsUsed = ws.members.length
    }
    entry.invitation.status = "accepted"
    return respond(tokenFor(user))
  },

  async getCurrentUser() {
    const user = await currentUser()
    return respond({ ...user, memberships: Object.entries(rolesClaim(user.id)).map(([workspaceId, role]) => ({ workspaceId, role })) })
  },

  async updateCurrentUser(body) {
    const user = await currentUser()
    if (body.name !== undefined && !body.name.trim())
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "name", message: "Enter your name." }])
    if (body.email !== undefined && body.email !== user.email) {
      if (!validEmail(body.email))
        return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "email", message: "Enter a valid email address." }])
      if (user.authProvider === "google")
        return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "email", message: "Your email is managed by Google." }])
      if (db.users.some((u) => u.id !== user.id && u.email === body.email))
        return fail("CONFLICT", "Another account already uses this email.")
    }
    Object.assign(user, body.name ? { name: body.name.trim(), initials: initialsOf(body.name) } : {}, body.email ? { email: body.email } : {})
    for (const ws of db.workspaces.values()) {
      const m = ws.members.find((x) => x.userId === user.id)
      if (m) Object.assign(m, { name: user.name, initials: user.initials, email: user.email })
    }
    return respond(user)
  },

  async getSecurityOverview() {
    const user = await currentUser()
    // Two-factor exists only for Google accounts (managed by Google).
    return respond({
      authProvider: user.authProvider,
      twoFactor: user.authProvider === "google" ? fx.security.twoFactor : null,
      sessions: db.sessions,
    })
  },

  async revokeSession(sessionId) {
    await currentUser()
    const session = db.sessions.find((s) => s.id === sessionId)
    if (!session) return fail("NOT_FOUND", "Session not found.")
    if (session.current) return fail("INVALID_STATE", "Use Log out to end this session.")
    db.sessions = db.sessions.filter((s) => s.id !== sessionId)
    return respond(undefined)
  },
}
