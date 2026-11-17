/** accounts-service: social account connections (platform OAuth). */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { accountsMock } from "@/lib/api/mocks/accounts-mock"
import type {
  AuthorizationRedirect,
  List,
  ListSocialAccountsParams,
  ReconnectRequest,
  SocialAccount,
  StartConnectionRequest,
} from "@/lib/api/types"

export interface AccountsService {
  /** GET /workspaces/{workspaceId}/social-accounts */
  listSocialAccounts(workspaceId: string, params?: ListSocialAccountsParams): Promise<List<SocialAccount>>
  /** GET /workspaces/{workspaceId}/social-accounts/{accountId} */
  getSocialAccount(workspaceId: string, accountId: string): Promise<SocialAccount>
  /** POST /workspaces/{workspaceId}/social-accounts/connections — 402 when a paid add-on is needed */
  startConnection(workspaceId: string, body: StartConnectionRequest): Promise<AuthorizationRedirect>
  /** POST /workspaces/{workspaceId}/social-accounts/{accountId}/reconnect */
  reconnect(workspaceId: string, accountId: string, body: ReconnectRequest): Promise<AuthorizationRedirect>
  /** DELETE /workspaces/{workspaceId}/social-accounts/{accountId} — paid extras only */
  disconnect(workspaceId: string, accountId: string): Promise<void>
}

const S = "accounts" as const

const accountsApi: AccountsService = {
  listSocialAccounts: (id, params = {}) =>
    http.get(S, path`/workspaces/${id}/social-accounts`, { query: params }),
  getSocialAccount: (id, accountId) => http.get(S, path`/workspaces/${id}/social-accounts/${accountId}`),
  startConnection: (id, body) => http.post(S, path`/workspaces/${id}/social-accounts/connections`, { body }),
  reconnect: (id, accountId, body) =>
    http.post(S, path`/workspaces/${id}/social-accounts/${accountId}/reconnect`, { body }),
  disconnect: (id, accountId) =>
    http.delete(S, path`/workspaces/${id}/social-accounts/${accountId}`, { responseType: "none" }),
}

export const accountsService: AccountsService = apiConfig.useMock.accounts ? accountsMock : accountsApi
