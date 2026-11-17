/** identity-service: sign-in, sign-up, password reset, invitations, current user. */
import { apiConfig, baseUrlFor } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { identityMock } from "@/lib/api/mocks/identity-mock"
import type {
  AcceptInvitationRequest,
  AuthProvider,
  CurrentUser,
  InvitationPreview,
  List,
  PasswordLoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  SecurityOverview,
  SignUpRequest,
  TokenRequest,
  TokenResponse,
  UpdateProfileRequest,
  User,
} from "@/lib/api/types"

export type AuthorizeParams = {
  provider: "google"
  redirectUri: string
  codeChallenge: string
  state: string
}

export interface IdentityService {
  /** GET /auth/providers */
  listAuthProviders(): Promise<List<AuthProvider>>
  /** GET /auth/authorize — a browser redirect, so this returns the URL to navigate to. */
  authorizeUrl(params: AuthorizeParams): string
  /** POST /auth/token */
  exchangeToken(body: TokenRequest): Promise<TokenResponse>
  /** POST /auth/password/login */
  loginWithPassword(body: PasswordLoginRequest): Promise<TokenResponse>
  /** POST /auth/signup */
  signUp(body: SignUpRequest): Promise<TokenResponse>
  /** POST /auth/password-resets */
  requestPasswordReset(body: PasswordResetRequest): Promise<void>
  /** POST /auth/password-resets/confirm */
  confirmPasswordReset(body: PasswordResetConfirmRequest): Promise<void>
  /** POST /auth/logout */
  logout(): Promise<void>
  /** GET /invitations/{token} */
  getInvitation(token: string): Promise<InvitationPreview>
  /** POST /invitations/{token}/accept */
  acceptInvitation(token: string, body?: AcceptInvitationRequest): Promise<TokenResponse>
  /** GET /users/me */
  getCurrentUser(): Promise<CurrentUser>
  /** PATCH /users/me */
  updateCurrentUser(body: UpdateProfileRequest): Promise<User>
  /** GET /users/me/security */
  getSecurityOverview(): Promise<SecurityOverview>
  /** DELETE /users/me/sessions/{sessionId} */
  revokeSession(sessionId: string): Promise<void>
}

const S = "identity" as const

const identityApi: IdentityService = {
  listAuthProviders: () => http.get(S, "/auth/providers", { auth: false }),
  authorizeUrl: ({ provider, redirectUri, codeChallenge, state }) => {
    const qs = new URLSearchParams({
      provider,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    })
    return `${baseUrlFor(S)}/auth/authorize?${qs}`
  },
  exchangeToken: (body) => http.post(S, "/auth/token", { body, auth: false }),
  loginWithPassword: (body) => http.post(S, "/auth/password/login", { body, auth: false }),
  signUp: (body) => http.post(S, "/auth/signup", { body, auth: false }),
  requestPasswordReset: (body) =>
    http.post(S, "/auth/password-resets", { body, auth: false, responseType: "none" }),
  confirmPasswordReset: (body) =>
    http.post(S, "/auth/password-resets/confirm", { body, auth: false, responseType: "none" }),
  logout: () => http.post(S, "/auth/logout", { responseType: "none" }),
  getInvitation: (token) => http.get(S, path`/invitations/${token}`, { auth: false }),
  acceptInvitation: (token, body) => http.post(S, path`/invitations/${token}/accept`, { body: body ?? {} }),
  getCurrentUser: () => http.get(S, "/users/me"),
  updateCurrentUser: (body) => http.patch(S, "/users/me", { body }),
  getSecurityOverview: () => http.get(S, "/users/me/security"),
  revokeSession: (sessionId) => http.delete(S, path`/users/me/sessions/${sessionId}`, { responseType: "none" }),
}

export const identityService: IdentityService = apiConfig.useMock.identity ? identityMock : identityApi
