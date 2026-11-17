/** workspace-service: workspaces, members, invitations, plan, Stripe billing. */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { workspaceMock } from "@/lib/api/mocks/workspace-mock"
import type {
  BillingPortalRequest,
  CheckoutSessionRequest,
  CreateInvitationRequest,
  CreateWorkspaceRequest,
  Invitation,
  List,
  ListMembersParams,
  Member,
  Page,
  RedirectUrl,
  UpdateMemberRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceSummary,
} from "@/lib/api/types"

export interface WorkspaceService {
  /** GET /workspaces */
  listWorkspaces(): Promise<List<WorkspaceSummary>>
  /** POST /workspaces */
  createWorkspace(body: CreateWorkspaceRequest): Promise<Workspace>
  /** GET /workspaces/{workspaceId} */
  getWorkspace(workspaceId: string): Promise<Workspace>
  /** PATCH /workspaces/{workspaceId} */
  updateWorkspace(workspaceId: string, body: UpdateWorkspaceRequest): Promise<Workspace>
  /** GET /workspaces/{workspaceId}/members */
  listMembers(workspaceId: string, params?: ListMembersParams): Promise<Page<Member>>
  /** PATCH /workspaces/{workspaceId}/members/{userId} */
  updateMember(workspaceId: string, userId: string, body: UpdateMemberRequest): Promise<Member>
  /** POST /workspaces/{workspaceId}/invitations */
  createInvitation(workspaceId: string, body: CreateInvitationRequest): Promise<Invitation>
  /** POST /workspaces/{workspaceId}/billing/portal-sessions */
  createBillingPortalSession(workspaceId: string, body: BillingPortalRequest): Promise<RedirectUrl>
  /** POST /workspaces/{workspaceId}/billing/checkout-sessions */
  createCheckoutSession(workspaceId: string, body: CheckoutSessionRequest): Promise<RedirectUrl>
}

const S = "workspace" as const

const workspaceApi: WorkspaceService = {
  listWorkspaces: () => http.get(S, "/workspaces"),
  createWorkspace: (body) => http.post(S, "/workspaces", { body }),
  getWorkspace: (id) => http.get(S, path`/workspaces/${id}`),
  updateWorkspace: (id, body) => http.patch(S, path`/workspaces/${id}`, { body }),
  listMembers: (id, params = {}) => http.get(S, path`/workspaces/${id}/members`, { query: params }),
  updateMember: (id, userId, body) => http.patch(S, path`/workspaces/${id}/members/${userId}`, { body }),
  createInvitation: (id, body) => http.post(S, path`/workspaces/${id}/invitations`, { body }),
  createBillingPortalSession: (id, body) => http.post(S, path`/workspaces/${id}/billing/portal-sessions`, { body }),
  createCheckoutSession: (id, body) => http.post(S, path`/workspaces/${id}/billing/checkout-sessions`, { body }),
}

export const workspaceService: WorkspaceService = apiConfig.useMock.workspace ? workspaceMock : workspaceApi
