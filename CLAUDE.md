# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Dev server on port 3003 (Turbopack)
npm run build         # Production build
npm run lint          # ESLint
npm run prettier:fix  # Auto-fix formatting
```

## Business Context

**TMN Transport** — Fleet Management + HR + Operational Transport platform. Four user teams: **Sales**, **Operasional**, **Keuangan**, **Manager/Admin**. Backend is Laravel 11 + Sanctum on port 4012.

## Architecture

Next.js 15 App Router built on the **Ecme** admin template. React 19, TypeScript, Tailwind CSS 4, Zustand for state, next-auth v5 (beta) for auth sessions.

### Route Groups

```
src/app/
  (auth-pages)/        # Sign-in, sign-up, forgot/reset password — no auth required
  (protected-pages)/   # Auth-guarded dashboard pages
  (public-pages)/      # Public-facing pages
  api/auth/            # next-auth + auth stub handlers
  api/proxy/[...path]/ # ← build this: forwards all backend requests server-side
```

Add new protected pages under `src/app/(protected-pages)/[feature]/page.tsx`.

### API Request Flow

All browser requests go to `/api` — **never call the Laravel backend directly from the browser**:

```
Browser (Axios, baseURL=/api)
  → /api/proxy/[...path]  (Next.js route handler — to be built)
    → reads Sanctum token from next-auth session server-side
    → http://localhost:4012/<endpoint>  Authorization: Bearer <token>
```

The proxy route handler (`src/app/api/proxy/[...path]/route.ts`) does not exist yet — it must be created. Once built, it eliminates the need to set `Authorization` headers in Axios anywhere.

- All API calls use `ApiService.fetchDataWithAxios()` in `src/services/ApiService.ts`.
- The Axios instance (`src/services/axios/AxiosBase.ts`) has `baseURL: '/api'`.
- Mutate request config in `src/services/axios/AxiosRequestIntrceptorConfigCallback.ts`.

### Authentication

`src/middleware.ts` enforces auth using next-auth. It reads `authRoutes` / `publicRoutes` from `src/configs/routes.config/` and redirects unauthenticated users to `/sign-in`.

- Login validation: `src/server/actions/user/validateCredential.ts` — currently mocked, replace with a call to `POST /api/login` on the Laravel backend.
- **Client components:** `useCurrentSession()` from `src/utils/hooks/useCurrentSession.ts` — never `getSession()`.
- **Server components:** `auth()` from `src/auth.ts`.
- Register new protected routes in `src/configs/routes.config/routes.config.ts`.
- Register new auth routes in `src/configs/routes.config/authRoute.ts`.

### Navigation & Routing

- Navigation tree: `src/configs/navigation.config/index.ts` — add entries with `NAV_ITEM_TYPE_ITEM`, `NAV_ITEM_TYPE_COLLAPSE`, or `NAV_ITEM_TYPE_TITLE`.
- Route metadata (layout type, container, authority): `src/configs/routes.config/routes.config.ts`.
- Entry paths: `src/configs/app.config.ts` (`authenticatedEntryPath: '/home'`, `unAuthenticatedEntryPath: '/sign-in'`).
- `authority: []` on a route or nav item means accessible to all authenticated users.

### Layouts

`PostLoginLayout` (`src/components/layouts/PostLoginLayout/PostLoginLayout.tsx`) switches between 6 layout types driven by Zustand theme state: `collapsibleSide`, `stackedSide`, `topBarClassic`, `framelessSide`, `contentOverlay`, `blank`. Override per-route via `meta.layout` in `routes.config.ts`.

### Component Boundaries

| Directory | Rule |
|-----------|------|
| `src/components/ui/` | **Do not edit** — owned by Ecme template |
| `src/components/shared/` | Custom reusable components |
| `src/components/template/` | Layout chrome (header, sidebar, nav) |
| `src/components/layouts/` | Top-level layout wrappers |

### Server Actions

`src/server/actions/` contains `'use server'` functions. Call from Server Components or form `action=` props — not from client-side event handlers.

## Conventions to Follow When Building Features

These utilities/files **do not exist yet** — create them as features are built:

| File | Purpose |
|------|---------|
| `src/constants/api.constant.ts` | `API_ENDPOINTS` object — never hardcode endpoint strings in service files |
| `src/constants/route.constant.ts` | `ROUTES` object — never hardcode path strings in components |
| `src/utils/error.util.ts` | `parseApiError(err)` — always parse errors through this, never `err.message` directly |
| `src/utils/formatNumber.ts` | `formatNum` / `formatRupiah` — never use `toLocaleString('id-ID')` directly in JSX (causes hydration mismatch) |

## API Response Contract

All backend responses follow this shape:

```typescript
// Single record
{ success: boolean; message: string; data: T; timestamp: string }

// Paginated
{ data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
```

## TypeScript

No `any` — use the type definitions in `src/@types/`. Role-based route guarding is wired up but commented out in `middleware.ts` — uncomment and extend when RBAC is needed.
