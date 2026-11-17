# MOSS Web App

Frontend for the MOSS automation platform.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives) — components live in `src/components/ui`
- **TanStack Query** (server state), **Zustand** (client state)
- **react-hook-form** + **zod** (forms), **lucide-react** (icons), **next-themes** (dark mode), **sonner** (toasts)

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000 — runs entirely on mock data by default
pnpm lint
pnpm typecheck
pnpm build
pnpm api:lint     # validate docs/api/openapi.yaml
```

With mocks on you're signed in as Maya (owner of "Studio North"). Email sign-in for any fixture user
(`maya@`, `alex@`, `jamie@studionorth.co`) uses the password `origin-demo`. Mock data lives in memory and resets on reload.

Add more shadcn components with `npx shadcn@latest add <component>`.

## API

- Spec: [`docs/api/API_SPEC.md`](docs/api/API_SPEC.md) (human-readable) and [`docs/api/openapi.yaml`](docs/api/openapi.yaml) (OpenAPI 3.1).
- Every screen gets its data through `src/lib/api`: one HTTP client, one service module per backend service, types that mirror the spec, and a mock implementation per service.
- Switch a service from mock to real with its env flag, e.g. `NEXT_PUBLIC_USE_MOCK_CONTENT=false` (see [`.env.example`](.env.example)). Switch **identity** first: real services reject mock tokens.

## Structure

```
src/
  app/
    layout.tsx            # root layout, fonts, providers
    (app)/                # authenticated app shell (sidebar + header + AuthGuard)
      page.tsx            # Dashboard (dashboard-view.tsx)
      compose/ calendar/ posts/ posts/[postId]/ media/ analytics/ accounts/ settings/
    (auth)/               # signed-out pages
      login/ signup/ forgot-password/ reset-password/ auth/callback/ invite/[token]/
  components/
    ui/                   # shadcn components (owned code)
    layout/               # sidebar, header, user menu, notifications, search
    shared/               # panels, pills, callouts, loading/error states, export menu
    auth/ posts/          # auth guard + sign-in UI, post actions
    providers.tsx         # Query, theme, tooltip, toaster
  config/                 # nav, brand, platform catalog
  hooks/
  lib/
    api/
      config.ts           # env: base URL, per-service mock flags
      http.ts             # HTTP client (auth header, refresh on 401, timeout, errors)
      types.ts            # request/response types (match openapi.yaml)
      services/           # one module per backend service
      mocks/              # fixtures + in-memory mock services
      hooks/              # TanStack Query hooks
    auth/ format.ts clock.ts navigation.ts utils.ts
docs/api/                 # API_SPEC.md, openapi.yaml, redocly.yaml
```

Design tokens (colors, radius) are CSS variables in `src/app/globals.css`.
