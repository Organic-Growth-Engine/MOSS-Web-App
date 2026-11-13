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
pnpm dev        # http://localhost:3000
pnpm lint
pnpm build
```

Add more shadcn components with `npx shadcn@latest add <component>`.

## Structure

```
src/
  app/
    layout.tsx          # root layout, fonts, providers
    (app)/              # authenticated app shell (sidebar + header)
      page.tsx          # Dashboard
      workflows/ runs/ integrations/ settings/
  components/
    ui/                 # shadcn components (owned code)
    layout/             # sidebar, user menu, page header
    providers.tsx       # Query, theme, tooltip, toaster
  config/nav.ts         # sidebar navigation
  hooks/
  lib/utils.ts          # cn() helper
```

Design tokens (colors, radius) are CSS variables in `src/app/globals.css`.
