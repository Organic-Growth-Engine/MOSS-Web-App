/**
 * In-memory mock backend state, seeded from fixtures. Mutations (new posts, uploads, connected
 * accounts…) last until the page is reloaded. Only "who is signed in" survives a reload, via
 * localStorage, so login/logout behave like the real refresh cookie.
 */
import * as fx from "@/lib/api/mocks/fixtures"
import { fail } from "@/lib/api/mocks/util"
import type {
  Invitation,
  MediaAsset,
  MediaFolder,
  Member,
  Notification,
  NotificationPreferences,
  Post,
  Role,
  SocialAccount,
  User,
  Workspace,
} from "@/lib/api/types"

export type WorkspaceData = {
  workspace: Workspace
  members: Member[]
  invitations: Invitation[]
  accounts: SocialAccount[]
  posts: Post[]
  media: MediaAsset[]
  folders: Omit<MediaFolder, "assetCount">[]
  notifications: Notification[]
  preferences: Record<string, NotificationPreferences>
}

const clone = <T>(v: T): T => structuredClone(v)

export const db = {
  users: clone(fx.users),
  passwords: new Map<string, string>(fx.users.map((u) => [u.id, fx.MOCK_PASSWORD])),
  workspaces: new Map<string, WorkspaceData>([
    [
      fx.WORKSPACE_ID,
      {
        workspace: clone(fx.workspace),
        members: clone(fx.members),
        invitations: [],
        accounts: clone(fx.socialAccounts),
        posts: clone(fx.posts),
        media: clone(fx.media),
        folders: clone(fx.mediaFolders),
        notifications: clone(fx.notifications),
        preferences: { usr_maya: clone(fx.notificationPreferences) },
      },
    ],
  ]),
  invitationTokens: clone(fx.invitationTokens),
  sessions: clone(fx.security.sessions),
  uploads: new Map<string, { fileName: string; contentType: string; sizeBytes: number; folderId: string | null }>(),
}

export function emptyWorkspace(workspace: Workspace, owner: User): WorkspaceData {
  return {
    workspace,
    members: [
      { userId: owner.id, name: owner.name, initials: owner.initials, email: owner.email, role: "owner", joinedAt: workspace.createdAt },
    ],
    invitations: [],
    accounts: [],
    posts: [],
    media: [],
    folders: [],
    notifications: [],
    preferences: {},
  }
}

// ── Mock session ────────────────────────────────────────────────────────

const SESSION_KEY = "origin.mock.session"
const SIGNED_OUT = "-"

function readSession(): string | null {
  if (typeof window === "undefined") return "usr_maya"
  try {
    const v = window.localStorage.getItem(SESSION_KEY)
    if (v === SIGNED_OUT) return null
    return v ?? "usr_maya" // fixtures start signed in as Maya
  } catch {
    return "usr_maya"
  }
}

export const mockSession = {
  userId: readSession(),
  signIn(userId: string) {
    mockSession.userId = userId
    try {
      window.localStorage.setItem(SESSION_KEY, userId)
    } catch {}
  },
  signOut() {
    mockSession.userId = null
    try {
      window.localStorage.setItem(SESSION_KEY, SIGNED_OUT)
    } catch {}
  },
}

export async function currentUser(): Promise<User> {
  const user = db.users.find((u) => u.id === mockSession.userId)
  if (!user) return fail("UNAUTHENTICATED", "Your session has expired. Please sign in again.")
  return user
}

const rank: Record<Role, number> = { editor: 1, admin: 2, owner: 3 }

/** Resolves a workspace the caller belongs to, enforcing the minimum role like the real services. */
export async function workspaceFor(workspaceId: string, minRole: Role = "editor") {
  const user = await currentUser()
  const data = db.workspaces.get(workspaceId)
  if (!data) return fail("NOT_FOUND", "Workspace not found.")
  const member = data.members.find((m) => m.userId === user.id)
  if (!member) return fail("FORBIDDEN", "You're not a member of this workspace.")
  if (rank[member.role] < rank[minRole])
    return fail("FORBIDDEN", `Only ${minRole}s can do this.`)
  return { data, user, member }
}

export function rolesClaim(userId: string): Record<string, Role> {
  const claim: Record<string, Role> = {}
  for (const [id, data] of db.workspaces) {
    const m = data.members.find((x) => x.userId === userId)
    if (m) claim[id] = m.role
  }
  return claim
}
