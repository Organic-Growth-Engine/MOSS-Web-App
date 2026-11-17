import { workspaceFor } from "@/lib/api/mocks/db"
import { emit } from "@/lib/api/mocks/events"
import { fail, newId, respond } from "@/lib/api/mocks/util"
import type { AccountsService } from "@/lib/api/services/accounts-service"
import type { Platform, SocialAccount } from "@/lib/api/types"
import { platformMeta } from "@/config/platforms"

const withSep = (url: string, qs: string) => `${url}${url.includes("?") ? "&" : "?"}${qs}`
const in60Days = () => new Date(Date.now() + 60 * 86_400_000).toISOString()

const accountTypes: Record<Platform, string> = {
  instagram: "Business account",
  linkedin: "Company page",
  facebook: "Business page",
  x: "Professional account",
  youtube: "YouTube channel",
}

export const accountsMock: AccountsService = {
  async listSocialAccounts(id, { platform, status } = {}) {
    const { data } = await workspaceFor(id)
    return respond({
      data: data.accounts.filter(
        (a) => (!platform || a.platform === platform) && (!status?.length || status.includes(a.status))
      ),
    })
  },

  async getSocialAccount(id, accountId) {
    const { data } = await workspaceFor(id)
    const account = data.accounts.find((a) => a.id === accountId)
    return account ? respond(account) : fail("NOT_FOUND", "Account not found.")
  },

  /**
   * The mock skips the platform's consent screen: it creates the connected account and returns
   * the URL the real OAuth callback would finally redirect to.
   */
  async startConnection(id, { platform, redirectUri }) {
    const { data, user } = await workspaceFor(id, "admin")
    if (!platformMeta[platform] || platformMeta[platform].comingSoon)
      return fail("VALIDATION_FAILED", "Some fields need attention.", [{ field: "platform", message: "This platform isn't available yet." }])
    if (data.accounts.length >= data.workspace.plan.accountSlots)
      return fail("PLAN_LIMIT_REACHED", "All social account slots on your plan are in use.")
    const hasDefault = data.accounts.some((a) => a.platform === platform && a.isDefault)
    if (hasDefault) {
      const addOnsUsed = data.accounts.filter((a) => a.isAddOn).length
      if (addOnsUsed >= data.workspace.plan.extraSocialAccounts)
        return fail(
          "PAYMENT_REQUIRED",
          `${platformMeta[platform].name} already has its included account. Connecting another needs an extra account slot (usable on any platform).`
        )
    }
    const handle = platform === "linkedin" || platform === "facebook" ? data.workspace.name : `@${data.workspace.slug.replace(/-/g, "")}`
    const account: SocialAccount = {
      id: newId("acc"),
      platform,
      handle: hasDefault ? `${handle}.${data.accounts.length}` : handle,
      displayName: hasDefault ? `${handle}.${data.accounts.length}` : handle,
      accountType: accountTypes[platform],
      audience: 0,
      audienceLabel: platform === "youtube" ? "subscribers" : "followers",
      status: "connected",
      isDefault: !hasDefault,
      isAddOn: hasDefault,
      connectedBy: { userId: user.id, name: user.name },
      connectedAt: new Date().toISOString(),
      authorizationExpiresAt: in60Days(),
      permissions:
        platform === "youtube"
          ? ["Upload videos & Shorts", "Read insights & account details"]
          : ["Create and publish content", "Read insights & account details"],
    }
    data.accounts.push(account)
    const state = newId("st")
    return respond({ authorizationUrl: withSep(redirectUri, `connected=${account.id}`), state })
  },

  async reconnect(id, accountId, { redirectUri }) {
    const { data, user } = await workspaceFor(id, "admin")
    const account = data.accounts.find((a) => a.id === accountId)
    if (!account) return fail("NOT_FOUND", "Account not found.")
    Object.assign(account, {
      status: "connected",
      authorizationExpiresAt: in60Days(),
      connectedBy: account.connectedBy ?? { userId: user.id, name: user.name },
      connectedAt: account.connectedAt ?? new Date().toISOString(),
    })
    // Destinations that failed only because this account had expired can now be retried (manually).
    emit(id, { type: "account.updated", accountId: account.id, accountStatus: "connected" })
    return respond({ authorizationUrl: withSep(redirectUri, `connected=${account.id}`), state: newId("st") })
  },

  async disconnect(id, accountId) {
    const { data } = await workspaceFor(id, "admin")
    const account = data.accounts.find((a) => a.id === accountId)
    if (!account) return fail("NOT_FOUND", "Account not found.")
    if (account.isDefault)
      return fail(
        "ACCOUNT_LOCKED",
        `This is your included ${platformMeta[account.platform].name} account. It can be reconnected, but not disconnected or replaced.`
      )
    data.accounts = data.accounts.filter((a) => a.id !== accountId)
    return respond(undefined)
  },
}
