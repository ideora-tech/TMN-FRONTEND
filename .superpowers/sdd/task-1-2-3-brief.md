# Frontend Tasks 1+2+3: Port, Proxy, Auth Wiring, Constants

Working directory: `D:\PROJECT-TMN\TMN-TRANSPORT-FRONTEND`

**Do NOT commit.**

## Context

Next.js 15 App Router + Ecme template. Uses **NextAuth v5** (the latest — `import NextAuth from 'next-auth'`, NOT `next-auth/next`). Auth is split across:
- `src/auth.ts` — exports `{ handlers, signIn, signOut, auth }` from `NextAuth({ ...authConfig })`
- `src/configs/auth.config.ts` — Credentials + GitHub + Google providers, `callbacks.session()`
- `src/app/api/auth/[...nextauth]/route.ts` — re-exports `handlers`
- `src/middleware.ts` — uses `auth` from NextAuth to guard routes

The **backend** is Laravel at `http://localhost:4019`. Login endpoint: `POST http://localhost:4019/api/v1/auth/login` with body `{ username, password }` (NOT email for the backend — but the current Ecme form sends `email`+`password`).

Backend login response:
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "<sanctum_bearer_token>",
    "pengguna": {
      "id_pengguna": "uuid",
      "username": "admin",
      "email": "admin@tmn.id",
      "aktif": 1
    }
  },
  "timestamp": "..."
}
```

## Task 1: Port + Environment

**1a. Update `package.json` dev script:**
```json
"dev": "next dev --turbopack --port 3019"
```

**1b. Update `.env` (the file at root):**
```
BACKEND_URL=http://localhost:4019
NEXTAUTH_URL=http://localhost:3019
AUTH_SECRET=tmntransport2026secretkey32chars!!
AUTH_TRUST_HOST=true
```
Keep existing GITHUB/GOOGLE keys. Remove old NEXTAUTH_URL line and replace.

## Task 2: API Proxy Handler

Create `src/app/api/proxy/[...path]/route.ts`:

```typescript
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4019'

async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const session = await auth()
    const { path } = await params
    const pathStr = path.join('/')

    const searchParams = new URL(request.url).searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/${pathStr}${searchParams ? `?${searchParams}` : ''}`

    const headers: Record<string, string> = {
        Accept: 'application/json',
    }

    // Inject Sanctum token from session
    const token = (session as any)?.accessToken
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')

    if (!isFormData) {
        headers['Content-Type'] = 'application/json'
    }

    let body: BodyInit | undefined
    if (!['GET', 'HEAD'].includes(request.method)) {
        body = isFormData ? await request.blob() : await request.text()
    }

    const response = await fetch(backendUrl, {
        method: request.method,
        headers,
        body,
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
```

## Task 2b: Wire Sanctum token into NextAuth session

Update `src/configs/auth.config.ts`:

Replace the entire Credentials provider authorize function to call the real backend:

```typescript
Credentials({
    async authorize(credentials) {
        try {
            const res = await fetch(`${process.env.BACKEND_URL ?? 'http://localhost:4019'}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    username: credentials?.email,   // Ecme form field is named "email"
                    password: credentials?.password,
                }),
            })

            if (!res.ok) return null

            const json = await res.json()
            if (!json?.success || !json?.data?.token) return null

            return {
                id:          json.data.pengguna.id_pengguna,
                name:        json.data.pengguna.username,
                email:       json.data.pengguna.email,
                accessToken: json.data.token,
            }
        } catch {
            return null
        }
    },
}),
```

Also update the `callbacks` in auth.config.ts to persist `accessToken` into session:

```typescript
callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.accessToken = (user as any).accessToken
            token.id          = user.id
        }
        return token
    },
    async session({ session, token }) {
        return {
            ...session,
            accessToken: token.accessToken,
            user: {
                ...session.user,
                id:        token.id as string,
                authority: ['user'],
            },
        }
    },
},
```

Also remove the `validateCredential` mock import since it's no longer used.

## Task 3: Constants & Utilities

**3a. Create `src/constants/api.constant.ts`:**

```typescript
export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN:  '/api/proxy/auth/login',
    AUTH_LOGOUT: '/api/proxy/auth/logout',
    AUTH_ME:     '/api/proxy/auth/me',

    // Proyek
    PROYEK:        '/api/proxy/proyek',
    PROYEK_DETAIL: (id: string) => `/api/proxy/proyek/${id}`,
    PROYEK_STATUS: (id: string) => `/api/proxy/proyek/${id}/status`,

    // Armada
    ARMADA:        '/api/proxy/armada',
    ARMADA_DETAIL: (id: string) => `/api/proxy/armada/${id}`,

    // Supir
    SUPIR:        '/api/proxy/supir',
    SUPIR_ME:     '/api/proxy/supir/me',
    SUPIR_DETAIL: (id: string) => `/api/proxy/supir/${id}`,

    // Vendor
    VENDOR:        '/api/proxy/vendor',
    VENDOR_DETAIL: (id: string) => `/api/proxy/vendor/${id}`,

    // Kontrak Vendor
    KONTRAK_VENDOR:        '/api/proxy/kontrak-vendor',
    KONTRAK_VENDOR_DETAIL: (id: string) => `/api/proxy/kontrak-vendor/${id}`,

    // Jadwal
    JADWAL:        '/api/proxy/jadwal',
    JADWAL_DETAIL: (id: string) => `/api/proxy/jadwal/${id}`,

    // Trip
    TRIP:          '/api/proxy/trip',
    TRIP_DETAIL:   (id: string) => `/api/proxy/trip/${id}`,
    TRIP_CHECKIN:  (id: string) => `/api/proxy/trip/${id}/checkin`,
    TRIP_CHECKOUT: (id: string) => `/api/proxy/trip/${id}/checkout`,
    TRIP_STATUS:   (id: string) => `/api/proxy/trip/${id}/status`,

    // Laporan Proyek
    LAPORAN:        '/api/proxy/laporan',
    LAPORAN_DETAIL: (id: string) => `/api/proxy/laporan/${id}`,

    // Faktur
    FAKTUR:        '/api/proxy/faktur',
    FAKTUR_DETAIL: (id: string) => `/api/proxy/faktur/${id}`,
    FAKTUR_STATUS: (id: string) => `/api/proxy/faktur/${id}/status`,

    // Rekonsiliasi
    REKONSILIASI:        '/api/proxy/rekonsiliasi',
    REKONSILIASI_DETAIL: (id: string) => `/api/proxy/rekonsiliasi/${id}`,

    // Karyawan
    KARYAWAN:        '/api/proxy/karyawan',
    KARYAWAN_DETAIL: (id: string) => `/api/proxy/karyawan/${id}`,

    // Penugasan
    PENUGASAN:        '/api/proxy/penugasan',
    PENUGASAN_DETAIL: (id: string) => `/api/proxy/penugasan/${id}`,
} as const
```

**3b. Replace `src/constants/route.constant.ts` entirely:**

```typescript
export const ROUTES = {
    HOME:     '/',
    SIGN_IN:  '/sign-in',

    PROYEK:        '/project',
    PROYEK_BARU:   '/project/baru',
    PROYEK_DETAIL: (id: string) => `/project/${id}`,

    ARMADA:        '/armada',
    ARMADA_BARU:   '/armada/baru',
    ARMADA_DETAIL: (id: string) => `/armada/${id}`,

    SUPIR:        '/supir',
    SUPIR_BARU:   '/supir/baru',
    SUPIR_DETAIL: (id: string) => `/supir/${id}`,

    VENDOR:        '/vendor',
    VENDOR_DETAIL: (id: string) => `/vendor/${id}`,

    JADWAL:        '/jadwal',
    JADWAL_DETAIL: (id: string) => `/jadwal/${id}`,

    TRIP:        '/trip',
    TRIP_DETAIL: (id: string) => `/trip/${id}`,

    LAPORAN:      '/laporan',
    LAPORAN_BARU: '/laporan/baru',

    FAKTUR:      '/faktur',
    FAKTUR_BARU: '/faktur/baru',

    REKONSILIASI:        '/rekonsiliasi',
    REKONSILIASI_DETAIL: (id: string) => `/rekonsiliasi/${id}`,
} as const
```

**3c. Create `src/utils/error.util.ts`:**

```typescript
import type { AxiosError } from 'axios'

export function parseApiError(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as AxiosError<{
            message?: string
            errors?: Record<string, string[]>
        }>
        const data = axiosErr.response?.data
        if (data?.errors) {
            const first = Object.values(data.errors)[0]
            if (Array.isArray(first) && first.length > 0) return first[0]
        }
        if (data?.message) return data.message
        return `Error ${axiosErr.response?.status ?? 'unknown'}`
    }
    if (err instanceof Error) return err.message
    return 'Terjadi kesalahan. Coba lagi.'
}
```

**3d. Create `src/utils/formatNumber.ts`:**

```typescript
export function formatRupiah(value: number): string {
    return 'Rp ' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatNum(value: number, decimals = 0): string {
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
```

## After implementing

Run: `npx tsc --noEmit 2>&1 | head -30` to catch type errors.

Write your report to: `D:\PROJECT-TMN\TMN-TRANSPORT-FRONTEND\.superpowers\sdd\task-1-2-3-report.md`

Return: Status, files modified/created, any TypeScript errors found.
