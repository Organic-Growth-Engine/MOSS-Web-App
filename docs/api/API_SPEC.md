# Origin API — v1 specification

Everything the Origin web app needs from the backend: what each screen shows, which endpoint provides it, and which service owns it.

- **Machine-readable contract:** [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1). It matches this document operation for operation; generate server stubs and validators from it. Lint with `pnpm api:lint`.
- **Frontend counterpart:** `src/lib/api/` — one typed function per endpoint, plus a mock implementation of each service that the app runs on until the real service is live (see [§10](#10-frontend-integration-and-mock-switch)).

## Contents

1. [Overview](#1-overview)
2. [Conventions](#2-conventions)
3. [Services](#3-services)
4. [Screen → endpoint map](#4-screen--endpoint-map)
5. [Endpoints](#5-endpoints) — [identity](#51-identity-service) · [workspace](#52-workspace-service) · [accounts](#53-accounts-service) · [content](#54-content-service) · [media](#55-media-service) · [analytics](#56-analytics-service) · [notifications](#57-notification-service) · [search](#58-search-api-gateway)
6. [Data models](#6-data-models)
7. [Business rules](#7-business-rules)
8. [Cross-service events](#8-cross-service-events)
9. [Open questions and assumptions](#9-open-questions-and-assumptions)
10. [Frontend integration and mock switch](#10-frontend-integration-and-mock-switch)

---

## 1. Overview

Origin lets a team plan, create, schedule and publish social posts to Instagram, LinkedIn, Facebook, X and YouTube from one workspace, and see how they perform.

| | |
|---|---|
| Backend stack | Node.js / Express microservices |
| Entry point | One API gateway; every service is reached through it |
| Base URL | `/api/v1` (same origin as the web app) |
| Format | JSON (`application/json`), UTF-8. Exports return `text/csv` or `application/pdf`. |
| Versioning | Major version in the path (`/api/v1`). Additive changes (new fields, endpoints, enum values) don't bump the version; clients must ignore unknown fields. Breaking changes ship as `/api/v2`. |
| Endpoints | **64** across **8** services (62 called by the web app, 2 browser-only OAuth callbacks) |
| Live updates | One Server-Sent Events stream per workspace (`GET W/events`) pushes notifications, post status, account health and fresh metrics |

## 2. Conventions

### 2.1 Authentication

Two sign-in methods, both issued by **identity-service**:

| Method | Flow |
|---|---|
| Google | OAuth 2.0 Authorization Code + PKCE. The browser goes to `GET /auth/authorize`; identity-service redirects to Google, handles Google's callback, then redirects to the web app's `/auth/callback?code&state`. The web app exchanges the code at `POST /auth/token`. |
| Email + password | `POST /auth/password/login` (and `POST /auth/signup`, `POST /invitations/{token}/accept`) return tokens directly. |

**Tokens**

- **Access token** — JWT, RS256, 15 minutes. Sent as `Authorization: Bearer <token>`. Kept in memory by the web app only.
- **Refresh token** — rotated on every use, set by identity-service as cookie `origin_refresh` (`HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`). The web app calls `POST /auth/token {"grantType":"refresh_token"}` on page load and after any `401`.
- **Claims:** `sub` (user id), `email`, `exp`, and **`workspaces`** — a map of the caller's roles, e.g. `{"ws_studio_north":"owner"}`. Every service authorizes workspace routes from this claim (no call to workspace-service needed). When a role or membership changes, the client refreshes the token.
- **Verification:** services verify signatures against identity-service's JWKS at `/.well-known/jwks.json`.

Social-platform authorization (connecting Instagram etc.) is a **separate** OAuth flow owned by accounts-service ([§5.3](#53-accounts-service)).

**Two-factor authentication** exists only for Google accounts and is managed entirely by Google. Origin doesn't offer 2FA for email/password accounts.

**Sessions.** Each refresh token is a session. Users see their active sessions and can sign out any session other than the current one (`DELETE /users/me/sessions/{id}`); the current one ends with `POST /auth/logout`.

### 2.2 Workspace scoping and roles

Workspace data lives under `/api/v1/workspaces/{workspaceId}/…` (written **`W/`** below). A caller who isn't a member gets `403`; a workspace that doesn't exist gets `404`.

| Role | Can |
|---|---|
| `editor` | Read everything in the workspace; create, edit, schedule, publish, duplicate, delete posts and retry destinations; upload and organise media; read analytics; manage own profile and notification preferences. |
| `admin` | Everything an editor can, plus connect/reconnect/disconnect social accounts, invite members, change roles (not `owner`), edit workspace details. |
| `owner` | Everything, plus Stripe billing (portal, add-on checkout) and granting/removing `owner`. A workspace always keeps at least one owner. |

"Role: member" below means any role.

### 2.3 Pagination, filtering, sorting

- Page-based (the UI shows numbered pages and "Showing 8 of 24"): `?page=1&pageSize=20`. `page` starts at 1; `pageSize` is 1–100, default 20.
- Paginated responses: `{ "data": [...], "meta": { "page": 1, "pageSize": 8, "total": 24, "totalPages": 3 } }`. Small bounded lists (accounts, folders, calendar) return `{ "data": [...] }`.
- Multi-value filters are comma-separated: `?status=failed,partially_published`.
- Sorting: `?sort=publishAt` ascending, `?sort=-publishAt` descending. Each list documents its allowed keys.
- Date filters (`from`, `to`) are inclusive `YYYY-MM-DD` dates **in the workspace's timezone**.

### 2.4 Data formats

- Timestamps: ISO 8601 date-time (`2026-03-24T17:00:00Z`). The UI formats everything in `Workspace.timezone`.
- Raw units only: sizes in **bytes** (decimal display, "18.4 MB"), durations in **seconds**, dimensions as `width`/`height`, rates as percent numbers (`4.8` = 4.8%) except `destinationSuccessRate` (0–1).
- Enums are lowercase snake_case; the UI owns display labels.
- IDs are opaque prefixed strings (`post_8f2c41`, `acc_ig_main`, `med_…`, `ws_…`, `usr_…`). Clients never parse them.

### 2.5 Errors

Every error uses one shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields need attention.",
    "details": [{ "field": "publishAt", "message": "Choose a time in the future." }],
    "requestId": "req_7Hk2v"
  }
}
```

`message` and `details[].message` are shown to users as-is, so write them for people. `requestId` is logged on both sides.

| HTTP | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON, bad query parameter, invalid/expired link token |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired access token, wrong password, no refresh cookie |
| 402 | `PAYMENT_REQUIRED` | Action needs a paid add-on (extra social account) |
| 403 | `FORBIDDEN` | Not a member, or role too low |
| 404 | `NOT_FOUND` | Resource doesn't exist in this workspace |
| 409 | `CONFLICT` | Duplicate (email, slug, folder name), resource in use |
| 409 | `INVALID_STATE` | Action not allowed in the resource's current state (edit a published post) |
| 409 | `PLAN_LIMIT_REACHED` | Seats or account slots exhausted |
| 409 | `ACCOUNT_LOCKED` | Tried to disconnect a platform's included (default) account |
| 422 | `VALIDATION_FAILED` | Well-formed body with invalid fields — always includes `details` |
| 500 | `INTERNAL` | Anything unexpected |

Every authenticated endpoint can return **401** and **500**; the tables below list only the additional codes.

## 3. Services

| Service | Owns | Path prefixes (gateway routing) |
|---|---|---|
| **identity-service** | Users, credentials, Google OAuth, tokens/sessions, password reset, invitation acceptance | `/auth/*`, `/users/me*`, `/invitations/*` |
| **workspace-service** | Workspaces, members, invitations (creation), plan & add-ons, Stripe billing | `/workspaces`, `W` (exact), `W/members*`, `W/invitations`, `W/billing/*` |
| **accounts-service** | Social account connections, platform OAuth, token health | `W/social-accounts*`, `/social-accounts/oauth/*` |
| **content-service** | Posts, destinations, scheduling, publishing workers, calendar, hashtag suggestions, post exports | `W/posts*`, `W/calendar` |
| **media-service** | Assets, folders, uploads (presigned storage), storage quota | `W/media*`, `W/media-folders` |
| **analytics-service** | Metrics ingestion from platforms, KPIs, series, best times, report exports | `W/analytics/*` |
| **notification-service** | In-app notifications, email delivery, per-user preferences, the live event stream | `W/notifications*`, `W/notification-preferences`, `W/events` |
| **api-gateway** | Routing, JWT pre-check, rate limiting, CORS; implements **search** by fan-out | `W/search` |

## 4. Screen → endpoint map

| Screen / component | Endpoints |
|---|---|
| App shell — sidebar plan card, nav badge | `GET W`, `GET W/social-accounts`, `GET W/posts/counts` |
| Workspace switcher | `GET /workspaces`, `POST /workspaces` |
| User menu | `GET /users/me`, `POST /auth/logout` |
| Notifications popover | `GET W/notifications`, `POST W/notifications/{id}/read` |
| Live updates (whole signed-in app) | `GET W/events` — new notifications show as toasts; post/account/metrics changes refresh the affected screens |
| Search (⌘K) | `GET W/search` |
| **Dashboard** `/` | `GET /users/me`, `GET W`, `GET W/analytics/overview`, `GET W/analytics/timeseries`, `GET W/posts/publishing-stats`, `GET W/posts` (up next: `status=scheduled&from=today&sort=publishAt&pageSize=2`; activity: `status=published,partially_published,failed&to=today&sort=-publishAt&pageSize=3`), `GET W/social-accounts` |
| **Compose** `/compose[?postId]` | `GET W`, `GET W/social-accounts`, `GET W/posts/{id}`, `POST W/posts`, `PATCH W/posts/{id}` (autosave), `POST …/schedule`, `POST …/publish`, `POST W/posts/hashtag-suggestions`, `GET W/media` (library picker), `POST W/media/uploads` + `…/complete` |
| **Calendar** `/calendar` | `GET W/calendar` (month/week/list range + channel filter), `GET W/posts` (next scheduled), `GET W/posts/counts?from&to` (this week), `GET W/analytics/best-times` |
| **Posts** `/posts` | `GET W/posts` (tabs, search, platform, pages of 8), `GET W/posts/counts`, `GET W/posts/export`, row menu: `POST …/duplicate`, `DELETE W/posts/{id}` |
| **Post detail** `/posts/{postId}` | `GET W/posts/{id}` (polled while `publishing`), `POST …/destinations/{id}/retry`, `POST …/duplicate`, `DELETE W/posts/{id}`, `GET W/social-accounts` |
| **Media** `/media` | `GET W/media-folders`, `GET W/media` (folder, search, type, sort, load more), `GET W/media/storage`, `POST W/media/uploads` + `…/complete`, `POST W/media-folders`, `PATCH W/media/{id}` (rename/move), `DELETE W/media/{id}` |
| **Analytics** `/analytics` | `GET W/analytics/overview`, `GET W/analytics/timeseries`, `GET W/analytics/platforms`, `GET W/analytics/export` |
| **Accounts** `/accounts` | `GET W/social-accounts`, `GET W/social-accounts/{id}`, `POST W/social-accounts/connections`, `POST …/{id}/reconnect`, `DELETE W/social-accounts/{id}`, `POST W/billing/checkout-sessions` (after 402) |
| **Settings** `/settings[?tab=]` | General: `GET/PATCH W`, `GET W/members`, `PATCH W/members/{userId}`, `GET/PATCH /users/me`, `GET/PUT W/notification-preferences`. Members: `GET W/members`, `POST W/invitations`. Billing: `GET W`, `GET W/social-accounts`, `POST W/billing/portal-sessions`. Security: `GET /users/me/security`, `DELETE /users/me/sessions/{id}` |
| `/login` | `GET /auth/providers`, `GET /auth/authorize`, `POST /auth/password/login` |
| `/auth/callback` | `POST /auth/token` (authorization_code) |
| `/signup` | `POST /auth/signup`, `GET /auth/authorize` |
| `/forgot-password`, `/reset-password` | `POST /auth/password-resets`, `POST /auth/password-resets/confirm` |
| `/invite/{token}` | `GET /invitations/{token}`, `POST /invitations/{token}/accept`, `GET /users/me` |
| Any page (session bootstrap, 401 retry) | `POST /auth/token` (refresh_token) |

---

## 5. Endpoints

Format of each entry: purpose and UI usage, auth/role, parameters, body, success response with an example, and additional error codes. Schemas are defined once in [§6](#6-data-models).

### 5.1 identity-service

#### `GET /auth/providers` — list sign-in methods
Used by `/login` and `/signup` to decide which options to show. **Auth:** public.

`200`
```json
{ "data": [
  { "id": "google", "name": "Google", "kind": "oauth" },
  { "id": "password", "name": "Email and password", "kind": "password" }
] }
```

#### `GET /auth/authorize` — start Google sign-in (browser redirect)
The browser navigates here (not fetch). **Auth:** public.

| Query | Required | Notes |
|---|---|---|
| `provider` | yes | `google` |
| `redirect_uri` | yes | Registered web-app URL, e.g. `https://app.origin.example/auth/callback` |
| `code_challenge` | yes | base64url(SHA-256(verifier)) |
| `code_challenge_method` | yes | `S256` |
| `state` | yes | Opaque CSRF value, echoed back |

`302` → Google. **Errors:** `400` unregistered `redirect_uri` or missing params.

#### `GET /auth/oauth/callback/{provider}` — Google callback (browser only)
Called by Google. Redirects to the original `redirect_uri` with `?code&state` (or `?error`). Not called by the web app. **Auth:** public. **Errors:** `400`.

#### `POST /auth/token` — exchange code / refresh session
**Auth:** public. Sets a rotated `origin_refresh` cookie.

Body — one of:
```json
{ "grantType": "authorization_code", "code": "4/0Ad…", "codeVerifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", "redirectUri": "https://app.origin.example/auth/callback" }
```
```json
{ "grantType": "refresh_token" }
```
`200`
```json
{ "accessToken": "eyJhbGciOiJSUzI1NiIs…", "tokenType": "Bearer", "expiresIn": 900 }
```
**Errors:** `400` bad/used code or verifier mismatch · `401` refresh cookie missing/expired/revoked.

#### `POST /auth/password/login` — email + password sign-in
**Auth:** public. Body `PasswordLoginRequest`:
```json
{ "email": "alex@studionorth.co", "password": "••••••••••" }
```
`200` `TokenResponse` (+ refresh cookie). **Errors:** `401` "That email and password don't match." (same message for unknown email) · `422` malformed email.

#### `POST /auth/signup` — create account + first workspace
**Auth:** public. identity-service creates the user, then asks workspace-service to create the workspace with the user as `owner`.
```json
{ "name": "Maya Chen", "email": "maya@studionorth.co", "password": "a-long-password", "workspaceName": "Studio North" }
```
`201` `TokenResponse` (+ refresh cookie). **Errors:** `409` email already registered · `422` fields (`password` < 10 chars, etc.).

#### `POST /auth/password-resets` — email a reset link
**Auth:** public. Body `{ "email": "alex@studionorth.co" }`. `202` always (no account enumeration). Link: `https://app.origin.example/reset-password?token=…`, valid 1 hour. **Errors:** `422` malformed email.

#### `POST /auth/password-resets/confirm` — set new password
**Auth:** public. Body `{ "token": "rst_…", "password": "another-password" }`. `204`; all sessions for the user are revoked. **Errors:** `400` invalid/expired token · `422` weak password.

#### `POST /auth/logout`
**Auth:** bearer. Revokes the refresh token, clears the cookie. `204`.

#### `GET /invitations/{token}` — preview an invitation
Used by `/invite/{token}`. **Auth:** public.

`200` `InvitationPreview`
```json
{
  "workspaceName": "Studio North",
  "email": "sam@studionorth.co",
  "role": "editor",
  "invitedBy": { "userId": "usr_maya", "name": "Maya Chen" },
  "expiresAt": "2026-03-30T19:00:00Z",
  "userExists": false
}
```
**Errors:** `404` unknown token · `409` already accepted or expired.

#### `POST /invitations/{token}/accept`
**Auth:** bearer *or* public. Signed-in callers just join. Anonymous callers send `name` + `password` to create a password account (Google users sign in first, then accept). Returns a fresh token whose `workspaces` claim includes the new workspace.
```json
{ "name": "Sam Park", "password": "a-long-password" }
```
`200` `TokenResponse`. **Errors:** `403` signed-in email differs from the invited email · `404` · `409` used/expired, or seat limit reached · `422` missing name/password when anonymous.

#### `GET /users/me`
User menu, dashboard greeting, profile form, "(you)" marker, picking the initial workspace. **Auth:** bearer.

`200` `CurrentUser`
```json
{
  "id": "usr_maya", "name": "Maya Chen", "initials": "MC", "email": "maya@studionorth.co",
  "authProvider": "google", "createdAt": "2026-03-01T17:00:00Z",
  "memberships": [{ "workspaceId": "ws_studio_north", "role": "owner" }]
}
```

#### `PATCH /users/me`
Settings → Your profile. **Auth:** bearer. Body `UpdateProfileRequest` (at least one field):
```json
{ "name": "Maya Chen" }
```
`200` `User`. **Errors:** `409` email in use · `422` empty name, bad email, or email change on a Google account ("Your email is managed by Google.").

#### `GET /users/me/security`
Settings → Security. `twoFactor` is present only for Google accounts (the UI links to Google's settings); it is `null` for email/password accounts. **Auth:** bearer.

`200` `SecurityOverview`
```json
{
  "authProvider": "google",
  "twoFactor": { "managedBy": "google", "enabled": null, "manageUrl": "https://myaccount.google.com/signinoptions/two-step-verification" },
  "sessions": [
    { "id": "ses_31f0", "device": "Chrome on macOS", "location": "Portland, US", "lastActiveAt": "2026-03-23T19:00:00Z", "current": true },
    { "id": "ses_8a21", "device": "Safari on iPhone", "location": "Portland, US", "lastActiveAt": "2026-03-21T15:15:00Z", "current": false }
  ]
}
```

#### `DELETE /users/me/sessions/{sessionId}` — sign out another session
Settings → Security → Sign out on a non-current session. Revokes that session's refresh token; its access token lapses within 15 minutes. **Auth:** bearer. `204`. **Errors:** `404` · `409 INVALID_STATE` for the current session ("Use Log out to end this session.").

### 5.2 workspace-service

#### `GET /workspaces` — switcher list
**Auth:** bearer. `200`
```json
{ "data": [{ "id": "ws_studio_north", "name": "Studio North", "initials": "SN", "kind": "team", "role": "owner" }] }
```

#### `POST /workspaces` — new workspace
Workspace switcher → New workspace; also the onboarding step for a signed-in user with no workspace. Caller becomes `owner` (client refreshes the token afterwards). **Auth:** bearer.
```json
{ "name": "North Studio Shop", "timezone": "America/Los_Angeles" }
```
`201` `Workspace`. **Errors:** `422`.

#### `GET W` — workspace
Sidebar, mobile header, dashboard subtitle, Settings, Accounts summary, timezone for all date display. **Role:** member.

`200` `Workspace`
```json
{
  "id": "ws_studio_north", "name": "Studio North", "initials": "SN", "kind": "team",
  "slug": "studio-north", "timezone": "America/Los_Angeles",
  "plan": { "name": "Team", "accountSlots": 10, "seats": 5, "extraSocialAccounts": 1 },
  "seatsUsed": 3, "createdAt": "2026-03-01T17:00:00Z"
}
```
**Errors:** `403`, `404`.

#### `PATCH W` — workspace details
Settings → Workspace details (Save changes). **Role:** admin.
```json
{ "name": "Studio North", "slug": "studio-north", "timezone": "America/New_York" }
```
`200` `Workspace`. Changing `timezone` does not move already-scheduled posts (their `publishAt` instants stay). **Errors:** `403` · `404` · `409` slug taken · `422` slug format `^[a-z0-9-]{3,40}$`.

#### `GET W/members`
Settings → General / Members, Billing seats. **Role:** member.

| Query | Notes |
|---|---|
| `page`, `pageSize` | standard |
| `sort` | `name`, `-name`, `joinedAt` (default), `-joinedAt` |

`200` `Page<Member>`
```json
{ "data": [
  { "userId": "usr_maya", "name": "Maya Chen", "initials": "MC", "email": "maya@studionorth.co", "role": "owner", "joinedAt": "2026-03-01T17:00:00Z" },
  { "userId": "usr_alex", "name": "Alex Lee", "initials": "AL", "email": "alex@studionorth.co", "role": "admin", "joinedAt": "2026-03-01T18:00:00Z" }
], "meta": { "page": 1, "pageSize": 100, "total": 3, "totalPages": 1 } }
```

#### `PATCH W/members/{userId}` — change role
Settings role select (Save changes). **Role:** admin; only an owner may grant or remove `owner`.
```json
{ "role": "admin" }
```
`200` `Member`. **Errors:** `403` · `404` · `409` would leave no owner · `422`.

#### `POST W/invitations` — invite by email
Settings → Invite member. Sends an email linking to `/invite/{token}` (expires in 7 days). **Role:** admin.
```json
{ "email": "sam@studionorth.co", "role": "editor" }
```
`201` `Invitation`
```json
{ "id": "inv_5Jq2xW", "email": "sam@studionorth.co", "role": "editor", "status": "pending",
  "invitedBy": { "userId": "usr_maya", "name": "Maya Chen" }, "expiresAt": "2026-03-30T19:00:00Z", "createdAt": "2026-03-23T19:00:00Z" }
```
**Errors:** `403` · `409` already a member, or `PLAN_LIMIT_REACHED` (members + pending invites ≥ seats) · `422`.

#### `POST W/billing/portal-sessions` — Stripe customer portal
Settings → Manage billing. **Role:** owner. Body `{ "returnUrl": "https://app.origin.example/settings?tab=billing" }`. `201` `{ "url": "https://billing.stripe.com/p/session/…" }`. **Errors:** `403`.

#### `POST W/billing/checkout-sessions` — buy an extra account slot
Accounts → Connect account, after `402 PAYMENT_REQUIRED`. The slot is **not tied to a platform**: it can hold a second (or later) account on any platform. On Stripe success (webhook) workspace-service increments `plan.extraSocialAccounts` by `quantity`. **Role:** owner.
```json
{ "item": "extra_social_account", "quantity": 1,
  "successUrl": "https://app.origin.example/accounts?checkout=success&platform=instagram",
  "cancelUrl": "https://app.origin.example/accounts" }
```
(`platform` in `successUrl` is only for the web app, to offer the right connection afterwards.)
`201` `{ "url": "https://checkout.stripe.com/c/pay/cs_…" }`. **Errors:** `403` · `422`.

### 5.3 accounts-service

#### `GET W/social-accounts`
Accounts page, dashboard account health and reconnect callout, sidebar plan card, Compose destinations, Billing slot usage. Not paginated (bounded by plan slots). **Role:** member.

| Query | Notes |
|---|---|
| `platform` | `instagram` · `linkedin` · `facebook` · `x` · `youtube` |
| `status` | comma-separated `AccountStatus` |

`200`
```json
{ "data": [{
  "id": "acc_ig_main", "platform": "instagram", "handle": "@studionorth", "displayName": "@studionorth",
  "accountType": "Business account", "audience": 12480, "audienceLabel": "followers",
  "status": "connected", "isDefault": true, "isAddOn": false,
  "connectedBy": { "userId": "usr_maya", "name": "Maya Chen" }, "connectedAt": "2026-03-03T18:00:00Z",
  "authorizationExpiresAt": "2026-05-02T17:00:00Z",
  "permissions": ["Create and publish content", "Read insights & account details"]
}] }
```
**Errors:** `400` bad filter.

#### `GET W/social-accounts/{accountId}`
Accounts → Manage connection dialog. **Role:** member. `200` `SocialAccount`. **Errors:** `404`.

#### `POST W/social-accounts/connections` — start connecting
Connect account dialog. **Role:** admin.
```json
{ "platform": "linkedin", "redirectUri": "https://app.origin.example/accounts" }
```
`201` `AuthorizationRedirect` — the browser goes to `authorizationUrl`:
```json
{ "authorizationUrl": "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=77abc&state=st_91x", "state": "st_91x" }
```
After consent the platform calls `GET /social-accounts/oauth/callback/{platform}`, which redirects to `redirectUri?connected={accountId}` or `?error=access_denied|account_mismatch|missing_permissions`.

**Errors:**
- `402 PAYMENT_REQUIRED` — the platform already has its included account and there's no unused extra slot. Message: "Instagram already has its included account. Connecting another needs an extra account slot (usable on any platform)." The UI then offers checkout.
- `409 PLAN_LIMIT_REACHED` — all `plan.accountSlots` used.
- `422` — platform not live (TikTok, Pinterest, Threads are "coming soon").

#### `GET /social-accounts/oauth/callback/{platform}` — platform callback (browser only)
Called by the social platform. Stores encrypted platform tokens, creates or updates the account, redirects back to the web app. **Auth:** public (bound to `state`). **Errors:** `400`.

#### `POST W/social-accounts/{accountId}/reconnect`
Reconnect buttons (dashboard, Accounts callout and cards, Manage dialog) and Connect on a `not_connected` card. Must re-authorize the **same** platform account; a different one fails with `error=account_mismatch`. **Role:** admin.
```json
{ "redirectUri": "https://app.origin.example/accounts" }
```
`201` `AuthorizationRedirect`. **Errors:** `404`.

#### `DELETE W/social-accounts/{accountId}` — disconnect a paid extra
Manage connection → Disconnect. Only `isAddOn` accounts; the platform's default account is locked. The freed add-on slot stays purchased. **Role:** admin. `204`. **Errors:** `404` · `409 ACCOUNT_LOCKED` ("This is your included Instagram account. It can be reconnected, but not disconnected or replaced.").

### 5.4 content-service

#### `GET W/posts`
Posts page; dashboard Up next and Recent activity; calendar Next scheduled. **Role:** member.

| Query | Notes |
|---|---|
| `status` | comma-separated `PostStatus`. The **Failed** tab sends `failed,partially_published`. |
| `platform` | posts with a destination on that platform |
| `q` | case-insensitive match on title and caption |
| `from`, `to` | `publishAt` date range in workspace timezone |
| `page`, `pageSize` | Posts page uses `pageSize=8` |
| `sort` | `-publishAt` (default), `publishAt`, `-updatedAt`, `updatedAt`. Posts without `publishAt` always sort **last**, most recently edited first. |

`200` `Page<Post>` — see the [`Post` example](#post).

#### `GET W/posts/counts`
Posts tab counts, sidebar Posts badge, calendar "This week" (`from`/`to` = that week). Same filters as the list except `status`. **Role:** member.

`200` `PostCounts`
```json
{ "all": 24, "draft": 6, "scheduled": 4, "publishing": 0, "published": 13, "partiallyPublished": 1, "failed": 0 }
```

#### `GET W/posts/publishing-stats`
Dashboard "Posts published" tile. **Role:** member. Query `from`, `to` (required).

`200` `PublishingStats`
```json
{ "postsPublished": 12, "destinationSuccessRate": 0.97, "destinationsNeedingAttention": 1, "connectedPlatforms": 5 }
```
`postsPublished` counts **posts** whose status is `published` or `partially_published` with `publishAt` in the period (one post to 5 platforms = 1). `destinationSuccessRate` and `destinationsNeedingAttention` are per destination. **Errors:** `400`.

#### `GET W/posts/export`
Posts → Export → CSV / PDF. Same filters as the list, no pagination. **Role:** member. Query `format=csv|pdf` (required).
`200` file with `Content-Disposition: attachment; filename="posts-2026-03-23.csv"`. CSV columns: Title, Status, Publish date (workspace tz), Destinations.

#### `POST W/posts/hashtag-suggestions` — AI hashtags
Compose → Suggest hashtags. Backed by a free AI model (backend's choice); no rate limit for now. The UI replaces any trailing hashtags in the caption with the suggestions. **Role:** editor.
```json
{ "caption": "A little room to grow. Meet our spring collection…", "platforms": ["instagram", "linkedin"] }
```
`200` `{ "hashtags": ["#StudioNorth", "#RoomToGrow"] }`. **Errors:** `422` empty caption.

#### `GET W/posts/{postId}`
Post detail page (polled every 1.5 s while `status=publishing`), Compose edit mode. **Role:** member. `200` `Post`. **Errors:** `404`.

#### `POST W/posts` — create draft
Compose → first Save draft / Schedule / Publish now. Destinations name a **platform**; the server attaches that platform's default account. **Role:** editor.
```json
{
  "title": "A little room to grow",
  "caption": "A little room to grow. Meet our spring collection… #StudioNorth #RoomToGrow",
  "link": "https://studionorth.co/spring",
  "mediaIds": ["med_room_to_grow"],
  "publishAt": "2026-03-24T17:00:00Z",
  "destinations": [
    { "platform": "instagram", "format": "reel" },
    { "platform": "linkedin", "format": "native_video", "captionOverride": "A little room to grow — our spring collection is here." },
    { "platform": "youtube", "format": "short", "title": "A little room to grow | Studio North" }
  ]
}
```
`201` `Post` with `status: "draft"`; `publishAt` on a draft is a *planned* time (shown on the calendar). **Errors:** `422` missing title, unknown media, platform without a connected default account.

#### `PATCH W/posts/{postId}` — update
Compose autosave (2 s after the last edit, drafts only) and Save draft. Any `PostInput` field; `destinations`, when sent, **replaces** the list (existing destination ids are kept per platform). Allowed for `draft` and `scheduled` only. **Role:** editor. `200` `Post`. **Errors:** `404` · `409 INVALID_STATE` · `422` (a scheduled post can't drop to zero destinations).

#### `DELETE W/posts/{postId}`
Posts row menu / post detail → Delete. Removes it from Origin only; content already live on platforms stays. **Role:** editor. `204`. **Errors:** `404` · `409 INVALID_STATE` while `publishing`.

#### `POST W/posts/{postId}/schedule`
Compose → Schedule. From `draft` or `scheduled` (reschedule). Sets all destinations to `scheduled`. **Role:** editor.
```json
{ "publishAt": "2026-03-24T17:00:00Z" }
```
`200` `Post`. **Errors:** `404` · `409 INVALID_STATE` · `422` `publishAt` not in the future, no destinations, or media unsuitable for a destination format (e.g. YouTube Short needs a video).

#### `POST W/posts/{postId}/publish` — publish now
Compose → Publish now. Asynchronous: returns `202` with `status: "publishing"` and `publishAt` = now; the publisher settles each destination and then rolls the post up to `published`, `partially_published` or `failed` (see [§7](#7-business-rules)). **Role:** editor. **Errors:** `404` · `409 INVALID_STATE` · `422` no destinations.

#### `POST W/posts/{postId}/duplicate`
Row menu / detail → Duplicate. New draft: title + " (copy)", no `publishAt`, destinations reset to `queued`. The UI opens it in Compose. **Role:** editor. `201` `Post`. **Errors:** `404`.

#### `POST W/posts/{postId}/destinations/{destinationId}/retry`
Post detail → Retry (reached from dashboard "Review"). **Role:** editor. `202` `Post` with that destination `publishing`. **Errors:** `404` · `409 INVALID_STATE` destination not `failed` · `422` its account still needs reconnecting ("Reconnect LinkedIn first, then retry.").

#### `GET W/calendar`
Calendar month grid (42-day range), week view, list view (one month), selected-day panel. Every post with a `publishAt` in range, drafts included, ordered by `publishAt`. Range ≤ 62 days. **Role:** member.

| Query | Required | Notes |
|---|---|---|
| `from`, `to` | yes | dates in workspace tz |
| `platform` | no | channel filter |

`200`
```json
{ "data": [
  { "postId": "post_8f2c41", "title": "A little room to grow", "publishAt": "2026-03-24T17:00:00Z", "status": "scheduled",
    "platforms": ["instagram", "linkedin", "facebook", "x", "youtube"], "mediaType": "video" }
] }
```
**Errors:** `400` range invalid or > 62 days.

### 5.5 media-service

#### `GET W/media`
Media grid (folder tile, search, type filter, sort, "Load more" = next page), Compose library picker. **Role:** member.

| Query | Notes |
|---|---|
| `folderId` | omit for all assets |
| `kind` | `image` · `video` |
| `q` | match on file name |
| `sort` | `-createdAt` (default), `createdAt` |
| `page`, `pageSize` | Media page uses `pageSize=8` |

`200` `Page<MediaAsset>`
```json
{ "data": [{
  "id": "med_room_to_grow", "name": "room-to-grow.mp4", "kind": "video", "format": "mp4", "mimeType": "video/mp4",
  "sizeBytes": 18400000, "durationSeconds": 24, "width": 1080, "height": 1920, "folderId": "fld_spring",
  "url": "https://media.origin.example/ws_studio_north/room-to-grow.mp4", "thumbnailUrl": null, "status": "ready",
  "usage": { "scheduledPostCount": 1, "postIds": ["post_8f2c41"] },
  "createdBy": { "userId": "usr_maya", "name": "Maya Chen" }, "createdAt": "2026-03-23T15:10:00Z"
}], "meta": { "page": 1, "pageSize": 8, "total": 48, "totalPages": 6 } }
```

#### `GET W/media/storage`
Media footer: "1.8 GB of 10 GB used", accepted formats, max size. **Role:** member.
```json
{ "usedBytes": 1800000000, "limitBytes": 10000000000, "maxFileBytes": 1000000000, "allowedFormats": ["jpg", "png", "webp", "mp4", "mov"] }
```

#### `POST W/media/uploads` — presigned upload
Media → Upload media; Compose → Add media. The browser then `PUT`s the file to `uploadUrl` with `headers`, then calls *complete*. New assets go into the currently open folder. **Role:** editor.
```json
{ "fileName": "spring-still-life.jpg", "contentType": "image/jpeg", "sizeBytes": 3200000, "folderId": "fld_spring" }
```
`201` `UploadTicket`
```json
{ "uploadId": "upl_92ac1f", "uploadUrl": "https://uploads.origin.example/…?X-Amz-Signature=…", "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" }, "expiresAt": "2026-03-23T19:15:00Z" }
```
**Errors:** `409` storage full · `422` unsupported type or > `maxFileBytes`.

#### `POST W/media/uploads/{uploadId}/complete`
**Role:** editor. `201` `MediaAsset` with `status: "processing"` until thumbnails, duration and dimensions are extracted, then `ready` (or `failed`). **Errors:** `404` · `409` object not found in storage.

#### `GET W/media/{mediaId}` · `PATCH W/media/{mediaId}` · `DELETE W/media/{mediaId}`
- **GET** — attached-media details. Role member. `200` `MediaAsset`. Errors `404`.
- **PATCH** — card menu → Rename / Move to folder. Role editor. Body `{ "name": "spring-hero.jpg" }` or `{ "folderId": "fld_brand" }` (`null` = no folder). `200` `MediaAsset`. Errors `404`, `422` (empty name, unknown folder).
- **DELETE** — card menu → Delete. Role editor. `204`. Errors `404`, `409` "This file is used in 1 draft or scheduled post. Remove it there first."

#### `GET W/media-folders` · `POST W/media-folders`
- **GET** — folder tiles and Move-to options. Role member.
  ```json
  { "data": [{ "id": "fld_spring", "name": "Spring collection", "assetCount": 18 },
             { "id": "fld_stories", "name": "Studio stories", "assetCount": 12 },
             { "id": "fld_brand", "name": "Brand essentials", "assetCount": 18 }],
    "meta": { "totalAssets": 48 } }
  ```
- **POST** — Media → New folder. Role editor. Body `{ "name": "Summer" }`. `201` `MediaFolder`. Errors `409` name taken (case-insensitive), `422`.

### 5.6 analytics-service

**Freshness:** metrics update the way the platforms deliver them — via platform webhooks where offered, otherwise by polling each platform's insights API. Every time new numbers land, analytics-service emits `metrics.updated` on the event stream and the open dashboard/analytics screens refetch immediately; `updatedAt` on the overview says when the data was last refreshed. (The UI also refetches every 5 minutes and on window focus as a fallback.)

All analytics endpoints take `from`/`to` (required, workspace tz). The **comparison period** is the same number of days immediately before `from` (Mar 1–23 → Feb 6–28). The UI's range options are month-to-date, last 7 days, last 30 days. **Role:** member.

#### `GET W/analytics/overview`
Analytics KPI tiles, "Compared with … · Updated 12 minutes ago", insight; dashboard KPI tiles and "+12.8% this month". Optional `platform`.
```json
{
  "range": { "from": "2026-03-01", "to": "2026-03-23" },
  "comparisonRange": { "from": "2026-02-06", "to": "2026-02-28" },
  "updatedAt": "2026-03-23T18:48:00Z",
  "kpis": {
    "impressions":    { "value": 128400, "previous": 113830, "change": 12.8, "changeUnit": "percent" },
    "engagements":    { "value": 6163,   "previous": 5197,   "change": 18.6, "changeUnit": "percent" },
    "engagementRate": { "value": 4.8,    "previous": 4.2,    "change": 0.6,  "changeUnit": "points" },
    "audience":       { "value": 24892,  "previous": 23006,  "change": 8.2,  "changeUnit": "percent" }
  },
  "insight": "Instagram Reels drove 41% of impressions during this period."
}
```
**Errors:** `400`.

#### `GET W/analytics/timeseries`
Daily impressions chart (Analytics and dashboard). Query `metric=impressions|engagements` (required), `from`, `to`, optional `platform`, `interval=day`.
```json
{ "data": [{ "date": "2026-03-01", "current": 2900, "previous": 2000 }, { "date": "2026-03-02", "current": 3300, "previous": 2400 }] }
```
`previous` is the value on the matching day of the comparison period. **Errors:** `400`.

#### `GET W/analytics/platforms`
Engagement-by-platform bars, platform table, platform filter options. One row per platform with a connected account.
```json
{ "data": [{ "platform": "instagram", "impressions": 52400, "engagements": 2840, "engagementRate": 5.4, "audience": 10842 }] }
```

#### `GET W/analytics/best-times`
Calendar → This week.
```json
{ "summary": "Your audience is most active Tuesday and Thursday at 10 AM.", "slots": [{ "weekday": 2, "hour": 10 }, { "weekday": 4, "hour": 10 }] }
```
`weekday` 0 = Sunday; hours in workspace tz.

#### `GET W/analytics/export`
Analytics → Export report → CSV / PDF. Query `format=csv|pdf` (required), `from`, `to`, optional `platform`. `200` file (`Content-Disposition: attachment; filename="analytics-2026-03-01-2026-03-23.pdf"`). Contains the KPIs with previous values and the per-platform table. **Errors:** `400`.

### 5.7 notification-service

#### `GET W/notifications`
Bell popover; `meta.unreadCount` drives the dot and its label ("Notifications, 1 needs attention"). Newest first. **Role:** member (own notifications only).

| Query | Notes |
|---|---|
| `unread` | `true` for unread only |
| `page`, `pageSize` | popover uses `pageSize=10` |

```json
{ "data": [{
  "id": "ntf_1a2b3c", "type": "account_expired", "severity": "warning", "title": "LinkedIn authorization expired",
  "detail": "Reconnect Studio North to resume scheduled publishing.", "href": "/accounts", "readAt": null, "createdAt": "2026-03-23T16:30:00Z"
}], "meta": { "page": 1, "pageSize": 10, "total": 2, "totalPages": 1, "unreadCount": 1 } }
```

#### `POST W/notifications/{notificationId}/read`
Clicking a notification. Idempotent. `200` `Notification`. **Errors:** `404`.

#### `GET W/notification-preferences` · `PUT W/notification-preferences`
Settings → Stay in the loop (per user, per workspace). **PUT** replaces the whole object (Save changes).
```json
{ "publishingResults": true, "accountHealth": true, "scheduleReminders": false, "weeklyInsights": true, "emailEnabled": true }
```
`200` `NotificationPreferences`. **Errors:** `422` non-boolean values.

#### `GET W/events` — live event stream (Server-Sent Events)
Opened once by the signed-in app and kept open. **Role:** member (only events the caller may see). The web app reads it with `fetch` so it can send the `Authorization` header; it reconnects with backoff and sends `Last-Event-ID` to resume (server replays up to 5 minutes).

Wire format (`text/event-stream`), with a `: ping` comment every 25 s:
```
id: evt_01HQ7
event: notification.created
data: {"id":"evt_01HQ7","type":"notification.created","occurredAt":"2026-03-24T17:00:06Z","notification":{"id":"ntf_9f2","type":"publish_partially_failed","severity":"warning","title":"A little room to grow","detail":"3 published · 2 need attention","href":"/posts/post_8f2c41","readAt":null,"createdAt":"2026-03-24T17:00:06Z"}}

id: evt_01HQ8
event: post.updated
data: {"id":"evt_01HQ8","type":"post.updated","occurredAt":"2026-03-24T17:00:06Z","postId":"post_8f2c41","postStatus":"partially_published"}
```

| `type` | Payload | UI reaction |
|---|---|---|
| `notification.created` | `notification` | toast with a View link; bell count refreshes |
| `post.updated` | `postId`, `postStatus` | posts, calendar, dashboard, post detail, media usage refresh |
| `account.updated` | `accountId`, `accountStatus` | accounts, reconnect callouts, sidebar plan card refresh |
| `metrics.updated` | `metricsUpdatedAt` | analytics and dashboard KPIs refresh |

notification-service is the stream's single endpoint; the other services publish to it through the event bus ([§8](#8-cross-service-events)). **Errors:** `401`, `403`.

### 5.8 search (api-gateway)

#### `GET W/search`
⌘K dialog. The gateway calls `GET W/posts?q=`, `GET W/media?q=` and `GET W/social-accounts` in parallel with the caller's token, filters accounts by name/handle, merges and truncates. Navigation pages are matched client-side. **Role:** member.

| Query | Required | Notes |
|---|---|---|
| `q` | yes | 1–200 chars |
| `types` | no | comma-separated `post,media,account` (default all) |
| `limit` | no | 1–50, default 8 |

```json
{ "data": [
  { "type": "post", "id": "post_d5e1b0", "label": "The spring edit is here", "hint": "Post · Published", "href": "/posts/post_d5e1b0" },
  { "type": "media", "id": "med_spring_still_life", "label": "spring-still-life.jpg", "hint": "Media · Spring collection", "href": "/media" }
] }
```
**Errors:** `400` empty `q`.

---

## 6. Data models

Field types use TypeScript notation; `?` = optional, `| null` = nullable. Enum values are exact.

### Common
| Model | Fields |
|---|---|
| `ErrorResponse` | `error: { code: ErrorCode, message: string, details?: FieldError[], requestId: string }` |
| `FieldError` | `field: string, message: string` |
| `PageMeta` | `page, pageSize, total, totalPages: integer` |
| `DateRange` | `from: date, to: date` |
| `UserRef` | `userId: string, name: string` |
| `RedirectUrl` | `url: uri` |
| `Platform` | `instagram` · `linkedin` · `facebook` · `x` · `youtube` |
| `Role` | `owner` · `admin` · `editor` |

### Identity
| Model | Fields |
|---|---|
| `AuthProvider` | `id: "google" \| "password"`, `name`, `kind: "oauth" \| "password"` |
| `TokenRequest` | `AuthorizationCodeGrant { grantType: "authorization_code", code, codeVerifier, redirectUri }` or `RefreshTokenGrant { grantType: "refresh_token" }` |
| `TokenResponse` | `accessToken`, `tokenType: "Bearer"`, `expiresIn` (seconds) |
| `PasswordLoginRequest` | `email`, `password` |
| `SignUpRequest` | `name`, `email`, `password` (≥ 10), `workspaceName` |
| `PasswordResetRequest` / `PasswordResetConfirmRequest` | `email` / `token`, `password` |
| `InvitationPreview` | `workspaceName`, `email`, `role`, `invitedBy: UserRef`, `expiresAt`, `userExists: boolean` |
| `AcceptInvitationRequest` | `name?`, `password?` (required when not signed in) |
| `User` | `id`, `name`, `initials`, `email`, `authProvider: "google" \| "password"`, `createdAt` |
| `CurrentUser` | `User` + `memberships: { workspaceId, role }[]` |
| `UpdateProfileRequest` | `name?`, `email?` (≥ 1 field) |
| `Session` | `id`, `device`, `location?`, `lastActiveAt`, `current: boolean` |
| `SecurityOverview` | `authProvider`, `twoFactor: { managedBy: "google", enabled?: boolean \| null, manageUrl: uri } \| null` (null for email/password accounts), `sessions: Session[]` |

### Workspace
| Model | Fields |
|---|---|
| `Plan` | `name`, `accountSlots` (total social accounts), `seats`, `extraSocialAccounts` (purchased extra slots, usable on any platform) |
| `Workspace` | `id`, `name`, `initials`, `kind: "team" \| "personal"`, `slug`, `timezone` (IANA), `plan: Plan`, `seatsUsed`, `createdAt` |
| `WorkspaceSummary` | `id`, `name`, `initials`, `kind`, `role` |
| `CreateWorkspaceRequest` | `name`, `timezone?` |
| `UpdateWorkspaceRequest` | `name?`, `slug?`, `timezone?` |
| `Member` | `userId`, `name`, `initials`, `email`, `role`, `joinedAt` |
| `UpdateMemberRequest` | `role` |
| `CreateInvitationRequest` | `email`, `role: "admin" \| "editor"` |
| `Invitation` | `id`, `email`, `role`, `status: "pending" \| "accepted" \| "expired"`, `invitedBy: UserRef`, `expiresAt`, `createdAt` |
| `BillingPortalRequest` | `returnUrl` |
| `CheckoutSessionRequest` | `item: "extra_social_account"`, `quantity?` (default 1), `successUrl`, `cancelUrl` |

### Accounts
| Model | Fields |
|---|---|
| `AccountStatus` | `connected` · `expires_soon` · `expired` · `not_connected` (authorization never completed or revoked on the platform; the record and its locked slot remain) |
| `SocialAccount` | `id`, `platform`, `handle`, `displayName`, `accountType`, `audience`, `audienceLabel: "followers" \| "subscribers"`, `status`, `isDefault` (platform's included, locked account; Compose publishes here), `isAddOn` (paid extra), `connectedBy?: UserRef \| null`, `connectedAt?`, `authorizationExpiresAt?`, `permissions: string[]` |
| `StartConnectionRequest` | `platform`, `redirectUri` |
| `ReconnectRequest` | `redirectUri` |
| `AuthorizationRedirect` | `authorizationUrl`, `state` |

### Content
| Model | Fields |
|---|---|
| `PostStatus` | `draft` · `scheduled` · `publishing` · `published` · `partially_published` · `failed` |
| `DestinationStatus` | `queued` · `scheduled` · `publishing` · `published` · `failed` |
| `DestinationFormat` | `post` (any) · `reel` (Instagram, Facebook) · `native_video` (LinkedIn) · `video_post` (X) · `short` (YouTube) |
| `MediaRef` | `id`, `name`, `kind`, `format`, `sizeBytes`, `durationSeconds?`, `width`, `height`, `thumbnailUrl?` |
| `DestinationError` | `code` (e.g. `authorization_expired`), `title`, `detail` |
| `Destination` | `id`, `accountId`, `platform`, `accountLabel` (denormalized), `format`, `captionOverride?: string \| null` (platform-only caption), `title?: string \| null` (YouTube), `status`, `publishedAt?`, `externalUrl?`, `error?: DestinationError \| null` |
| `Post` | `id`, `title` (internal name), `caption`, `link?`, `media: MediaRef[]`, `mediaType: "image" \| "video" \| null` (from first media), `status`, `publishAt?` (scheduled/planned/actual), `createdBy: UserRef`, `createdAt`, `updatedAt`, `destinations: Destination[]` |
| `DestinationInput` | `platform`, `format`, `captionOverride?`, `title?` |
| `PostInput` | `title` (1–120), `caption?`, `link?`, `mediaIds?`, `publishAt?`, `destinations?: DestinationInput[]` |
| `UpdatePostRequest` | any `PostInput` field (≥ 1) |
| `SchedulePostRequest` | `publishAt` |
| `PostCounts` | `all`, `draft`, `scheduled`, `publishing`, `published`, `partiallyPublished`, `failed` |
| `PublishingStats` | `postsPublished` (posts), `destinationSuccessRate` (0–1, per destination), `destinationsNeedingAttention`, `connectedPlatforms` |
| `HashtagSuggestionRequest` / `HashtagSuggestions` | `caption`, `platforms?` / `hashtags: string[]` |
| `CalendarEntry` | `postId`, `title`, `publishAt`, `status`, `platforms`, `mediaType` |

<a id="post"></a>**`Post` example** (the partially published post the dashboard asks you to review):
```json
{
  "id": "post_9c3e58", "title": "Meet the makers", "caption": "Meet the makers.", "link": null,
  "media": [{ "id": "med_meet_the_makers", "name": "meet-the-makers.mp4", "kind": "video", "format": "mp4",
              "sizeBytes": 42600000, "durationSeconds": 24, "width": 1080, "height": 1920, "thumbnailUrl": null }],
  "mediaType": "video", "status": "partially_published", "publishAt": "2026-03-21T21:00:00Z",
  "createdBy": { "userId": "usr_maya", "name": "Maya Chen" },
  "createdAt": "2026-03-20T21:00:00Z", "updatedAt": "2026-03-21T21:00:00Z",
  "destinations": [
    { "id": "dst_0031", "accountId": "acc_ig_main", "platform": "instagram", "accountLabel": "@studionorth", "format": "reel",
      "captionOverride": null, "title": null, "status": "published", "publishedAt": "2026-03-21T21:00:02Z", "externalUrl": null, "error": null },
    { "id": "dst_0032", "accountId": "acc_li", "platform": "linkedin", "accountLabel": "Studio North", "format": "native_video",
      "captionOverride": null, "title": null, "status": "failed", "publishedAt": null, "externalUrl": null,
      "error": { "code": "authorization_expired", "title": "Authorization expired", "detail": "No post was created on LinkedIn" } }
  ]
}
```

### Media
| Model | Fields |
|---|---|
| `MediaKind` / `MediaFormat` | `image` · `video` / `jpg` · `png` · `webp` · `mp4` · `mov` |
| `MediaAsset` | `id`, `name`, `kind`, `format`, `mimeType`, `sizeBytes`, `durationSeconds?`, `width`, `height`, `folderId: string \| null`, `url`, `thumbnailUrl?`, `status: "processing" \| "ready" \| "failed"`, `usage: { scheduledPostCount, postIds }`, `createdBy: UserRef`, `createdAt` |
| `UpdateMediaRequest` | `name?`, `folderId?: string \| null` |
| `CreateUploadRequest` | `fileName`, `contentType`, `sizeBytes` (≤ 1 GB), `folderId?` |
| `UploadTicket` | `uploadId`, `uploadUrl`, `method: "PUT"`, `headers`, `expiresAt` |
| `MediaFolder` / `MediaFolderList` | `id`, `name`, `assetCount` / `data: MediaFolder[], meta: { totalAssets }` |
| `CreateFolderRequest` | `name` (1–60) |
| `StorageUsage` | `usedBytes`, `limitBytes`, `maxFileBytes`, `allowedFormats` |

### Analytics, notifications, search
| Model | Fields |
|---|---|
| `Kpi` | `value`, `previous`, `change`, `changeUnit: "percent" \| "points"` |
| `AnalyticsOverview` | `range`, `comparisonRange`, `updatedAt`, `kpis: { impressions, engagements, engagementRate, audience }`, `insight?` |
| `TimeseriesPoint` | `date`, `current`, `previous` |
| `PlatformMetrics` | `platform`, `impressions`, `engagements`, `engagementRate` (percent), `audience` |
| `BestTimes` | `summary`, `slots: { weekday: 0–6, hour: 0–23 }[]` |
| `Notification` | `id`, `type: account_expired \| account_expires_soon \| publish_succeeded \| publish_partially_failed \| publish_failed \| invitation_accepted`, `severity: success \| warning \| error \| info`, `title`, `detail`, `href` (in-app path), `readAt?`, `createdAt` |
| `NotificationPreferences` | `publishingResults`, `accountHealth`, `scheduleReminders`, `weeklyInsights`, `emailEnabled` (all boolean) |
| `RealtimeEvent` | `id`, `type: notification.created \| post.updated \| account.updated \| metrics.updated`, `occurredAt`, and per type: `notification` · `postId`, `postStatus` · `accountId`, `accountStatus` · `metricsUpdatedAt` |
| `SearchResult` | `type: post \| media \| account`, `id`, `label`, `hint`, `href` |

## 7. Business rules

**Social accounts (one included account per platform, paid extras)**
1. The first account connected on a platform becomes that platform's **default**: `isDefault: true`. It is **locked**: it can be reconnected (same platform account only) but not disconnected or replaced.
2. Compose always publishes to the platform's default account. Destinations are requested by platform; content-service resolves the account.
3. A second (or later) account on any platform needs an **extra account slot** (`plan.extraSocialAccounts`). Slots aren't tied to a platform: one slot can hold an extra Instagram today and an extra LinkedIn after that one is disconnected. Without a free slot, connecting returns `402 PAYMENT_REQUIRED`; the owner buys one through `POST W/billing/checkout-sessions`.
4. Paid extra accounts (`isAddOn: true`) can be disconnected; the slot stays purchased and can be reused on any platform.
5. Total accounts are also capped by `plan.accountSlots` (`409 PLAN_LIMIT_REACHED`).
6. A slot is "used" when the account's status is not `not_connected`.

**Post lifecycle**
- `draft` → `scheduled` (schedule) → `publishing` (at `publishAt`, or publish now) → `published` | `partially_published` | `failed`.
- Roll-up after publishing: all destinations `published` → `published`; some → `partially_published`; none → `failed`.
- Retrying a failed destination puts the post back in `publishing` until it settles again. Retries are always **manual** (the user clicks Retry), including after an account is reconnected.
- Only `draft` and `scheduled` posts can be edited or (re)scheduled. Any post except `publishing` can be deleted.
- A destination whose account is `expired` or `not_connected` at publish time fails with `error.code = authorization_expired | account_not_connected`.
- `captionOverride` set → that platform uses it instead of `caption` ("Edit for {platform} only" in Compose).
- `publishAt` must be in the future when scheduling. It's an absolute instant: changing the workspace timezone doesn't move it.

**Members and seats** — invitations count against seats while pending; a workspace always keeps one `owner`.

**Media** — an asset used by a draft or scheduled post can't be deleted. `usage` counts scheduled posts only (that's what the UI shows).

## 8. Cross-service events

The services are independent, so a few UI facts depend on events between them (transport is a backend choice — e.g. a message bus):

| Event | Producer → consumers | Effect |
|---|---|---|
| `account.status_changed` | accounts → content, notifications | content fails/unblocks destinations; notification `account_expired` / `account_expires_soon`; stream `account.updated` |
| `account.connected` / `account.disconnected` | accounts → content, analytics | content resolves default accounts; analytics starts/stops ingestion |
| `post.published` / `post.destination_failed` | content → notifications, analytics, media | publish notifications (stream `notification.created`, `post.updated`); metrics ingestion; media `usage` refresh |
| `metrics.ingested` | analytics → notifications | stream `metrics.updated` |
| `post.saved` / `post.deleted` | content → media | media `usage` and delete guard |
| `membership.changed` | workspace → identity | identity reissues role claims on next refresh |
| `invitation.created` | workspace → identity, notifications | token for `/invite/{token}`; invitation email |
| `checkout.completed` (Stripe webhook) | workspace → accounts | new add-on slot available |

## 9. Open questions and assumptions

**Decided with the product owner (recorded here):** Node/Express microservices; Google OAuth plus email/password (no magic link), including sign-up and password reset; workspace scoping in the path; role claims carried in the token; one locked default account per platform with paid extras; per-platform caption overrides; campaigns removed; `partially_published` status; AI hashtag suggestions (provider left to backend); email invitations; Stripe billing; two-factor left to the identity provider; search via gateway fan-out; platform catalog stays a frontend constant; exports in CSV and PDF; opaque post IDs.

**Answered in the second review:**

| Question | Answer |
|---|---|
| 2FA for email/password users | None. 2FA exists only for Google accounts, managed by Google. |
| Hashtag model and limits | A free AI model; no rate limit for now. |
| Extra-account pricing | One generic slot, usable on any platform. |
| "Posts published" on the dashboard | Counts posts, not destinations. |
| Analytics and notification freshness | Live: notifications are pushed as they happen and metrics refresh as the platforms deliver them (event stream, §5.7). |
| Auto-retry after reconnect | No. Retry stays manual. |
| Media thumbnails / processing | Deferred. `thumbnailUrl` stays nullable and the UI keeps its placeholder tiles. |
| Revoking other sessions | Yes: `DELETE /users/me/sessions/{sessionId}`. |

**Still open:**

1. **`not_connected` accounts.** Assumed: a locked record exists for a platform whose authorization never completed or was revoked on the platform's side, and Connect re-authorizes it. Confirm that's how accounts-service will model it.
2. **Export limits.** Max rows for post CSV/PDF exports, and should large exports become async (email a link)?
3. **Rate limiting at the gateway.** Not needed for hashtags now, but agree on a `429` + `Retry-After` shape before launch.
4. **Notification retention**, and whether "mark all as read" is wanted (not in the UI today).
5. **Event stream hosting.** SSE needs long-lived connections through the gateway (disable response buffering, idle timeout > 25 s). Confirm the gateway/load balancer setup.

## 10. Frontend integration and mock switch

- HTTP client: `src/lib/api/http.ts` (base URL, bearer injection, single silent refresh on `401`, timeout, `ApiError`).
- Services: `src/lib/api/services/*-service.ts` — one function per endpoint, each annotated with its method and path.
- Types: `src/lib/api/types.ts` mirrors `components/schemas` here.
- Mocks: `src/lib/api/mocks/` implement the same interfaces over in-memory fixtures shaped exactly like these responses, including the error codes and business rules above.

Each service switches independently with an env flag (inlined at build time; unset = mock):

```bash
NEXT_PUBLIC_API_BASE_URL=/api/v1          # gateway
NEXT_PUBLIC_USE_MOCK_IDENTITY=false       # identity-service is live
NEXT_PUBLIC_USE_MOCK_CONTENT=false        # content-service is live
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:4003/api/v1   # optional: bypass the gateway for one service
```

Turn **identity** off first (or together with others): real services reject the mock's unsigned tokens. See `.env.example` for every variable.
