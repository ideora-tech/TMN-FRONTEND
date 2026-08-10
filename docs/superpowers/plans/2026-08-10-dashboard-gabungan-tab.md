# Dashboard Gabungan ber-Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/home` tampil seperti `/dashboard-armada` (abu-abu, full-width) dan memuat kedua dashboard sebagai tab Operasional | Armada.

**Architecture:** Konten kedua halaman dipindah jadi dua komponen tab di folder `home/`; `home/page.tsx` memakai pola Tabs `perawatan-armada`; meta route `/home` dihapus; `/dashboard-armada` jadi redirect.

**Tech Stack:** Next.js 15 App Router, Ecme Tabs, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-10-dashboard-gabungan-tab-design.md`

## Global Constraints

- **DILARANG commit / build (`npm run build`, docker)** — user jalankan sendiri; verifikasi via `npm run lint` + `npx next lint --file`.
- Semua teks UI bahasa Indonesia; tanpa komentar penjelas.
- Konten dashboard TIDAK berubah — hanya dipindah (copy utuh state/fetch/JSX).

---

### Task 1: Ekstrak dua komponen tab

**Files:**
- Create: `src/app/(protected-pages)/home/DashboardOperasionalTab.tsx`
- Create: `src/app/(protected-pages)/home/DashboardArmadaTab.tsx`

**Interfaces:**
- Produces: dua komponen default-export tanpa props, masing-masing fetch datanya sendiri saat mount — dipakai Task 2.

- [x] **Step 1: `DashboardOperasionalTab.tsx`**

Salin SELURUH isi `home/page.tsx` sekarang dengan perubahan:
- Nama komponen `DashboardOperasionalTab`.
- Hapus blok judul (`<div><h4>Dashboard</h4>…</div>`) — judul pindah ke page.
- Wrapper root jadi `<div className="flex flex-col gap-6">` (tanpa `p-6`; padding di page).
- Semua state, interface `DashboardStats`, `EMPTY`, banner alert, grid kartu, skeleton — utuh.

- [x] **Step 2: `DashboardArmadaTab.tsx`**

Salin SELURUH isi `dashboard-armada/page.tsx` sekarang dengan perubahan:
- Nama komponen `DashboardArmadaTab`.
- Hapus blok judul (`<div><h4>Dashboard Armada</h4>…</div>`).
- Wrapper root jadi `<div className="flex flex-col gap-6">`.
- `EMPTY`, `STATUS_BADGE`, `TH_CLASS`/`TD_CLASS`, kartu, 2 tabel, navigasi `keDetail` — utuh.

---

### Task 2: Page ber-tab, redirect, meta & nav

**Files:**
- Modify: `src/app/(protected-pages)/home/page.tsx` (tulis ulang)
- Modify: `src/app/(protected-pages)/dashboard-armada/page.tsx` (tulis ulang jadi redirect)
- Modify: `src/configs/routes.config/routes.config.ts:13-20` (hapus meta `/home`)
- Modify: `src/configs/navigation.config/index.ts:58-64` (hapus item `dashboard-armada`)

**Interfaces:**
- Consumes: `DashboardOperasionalTab` + `DashboardArmadaTab` (Task 1); `useCurrentSession` (authority, pola `pembelian-sparepart/[id]/page.tsx:36`).

- [x] **Step 1: `home/page.tsx` baru**

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import DashboardOperasionalTab from './DashboardOperasionalTab'
import DashboardArmadaTab from './DashboardArmadaTab'

const ARMADA_AUTHORITY = ['dispatcher', 'manager', 'superadmin', 'admin']

export default function HomePage() {
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const bisaLihatArmada = authority.some(a => ARMADA_AUTHORITY.includes(a))

    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab = tabParam === 'armada' && bisaLihatArmada ? 'armada' : 'operasional'
    const [activeTab, setActiveTab] = useState(initialTab)

    return (
        <div className="flex flex-col gap-4 p-6">
            <div>
                <h4 className="font-bold">Dashboard</h4>
                <p className="text-sm text-gray-500 mt-0.5">Ringkasan operasional TMN Transport</p>
            </div>
            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="operasional">Operasional</Tabs.TabNav>
                    {bisaLihatArmada && <Tabs.TabNav value="armada">Armada</Tabs.TabNav>}
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="operasional"><DashboardOperasionalTab /></Tabs.TabContent>
                    {bisaLihatArmada && (
                        <Tabs.TabContent value="armada"><DashboardArmadaTab /></Tabs.TabContent>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
```

- [x] **Step 2: `dashboard-armada/page.tsx` jadi redirect**

```tsx
import { redirect } from 'next/navigation'

export default function DashboardArmadaPage() {
    redirect('/home?tab=armada')
}
```

- [x] **Step 3: Hapus meta `/home` di `routes.config.ts`**

```ts
    '/home': {
        key: 'home',
        authority: [],
    },
```

- [x] **Step 4: Hapus item nav `dashboard-armada`** (blok `key: 'dashboard-armada'` di `navigation.config/index.ts` baris 58-64) — entri "Dashboard" `/home` tetap.

---

### Task 3: Lint

- [x] **Step 1:** `npx next lint --file "src/app/(protected-pages)/home/page.tsx" --file "src/app/(protected-pages)/home/DashboardOperasionalTab.tsx" --file "src/app/(protected-pages)/home/DashboardArmadaTab.tsx" --file "src/app/(protected-pages)/dashboard-armada/page.tsx" --file src/configs/routes.config/routes.config.ts --file src/configs/navigation.config/index.ts`
Expected: 0 error. JANGAN build/commit — verifikasi visual oleh user.

---

## Verifikasi Manual (oleh user)

1. `/home`: background abu-abu, konten full-width (tidak menyempit ke tengah), judul + 2 tab.
2. Tab Operasional = konten home lama; tab Armada = konten dashboard-armada lama.
3. `/dashboard-armada` → redirect ke `/home?tab=armada`, tab Armada langsung aktif.
4. Login role sales murni → hanya tab Operasional; sidebar tanpa "Dashboard Armada".
