# Design System Refactor — TMN Transport Frontend

**Date:** 2026-06-26
**Scope:** TMN-TRANSPORT-FRONTEND (`D:\PROJECT-TMN\TMN-TRANSPORT-FRONTEND\`)
**Reference:** HR-EMPLOYEE-FRONTEND design system (Ecme component library, green theme)

---

## Goal

Align the TMN Transport frontend's visual design with the HR Employee frontend. Both projects use the Ecme template but TMN's feature pages were built with raw HTML/Tailwind instead of Ecme components. This spec covers all changes needed to make TMN look and behave like HR.

---

## 1. Config Changes

### 1a. Activate Green Theme
**File:** `src/configs/theme.config.ts`

Change `themeSchema: ''` → `themeSchema: 'green'`

The `green` preset already exists in `preset-theme-schema.config.ts`:
- primary: `#0CAF60`
- primaryDeep: `#088d50`
- primaryMild: `#34c779`
- primarySubtle: `#0CAF601a`

This automatically updates sidebar active states, links, focus rings, and all primary-colored Ecme components.

### 1b. Add Navigation Icons
**File:** `src/configs/navigation-icon.config.tsx`

Replace the 6 default-only icons with the full Pi duotone icon set matching HR. Icons needed for TMN navigation keys: `home`, `briefcase` (project), `truck` (armada), `users` (supir), `building` (vendor), `calendar` (jadwal), `clipboard` (laporan), `receipt` (faktur), `chart-bar` (rekonsiliasi), `map-pin` (trip).

All from `react-icons/pi` (already installed).

---

## 2. Design Patterns Applied to All Pages

### 2a. List Pages

```tsx
'use client'
import { Card, Button, DataTable } from '@/components/ui'
import { HiPlusCircle, HiOutlinePencilAlt, HiOutlineEye } from 'react-icons/hi'
import { useRouter } from 'next/navigation'

// Header pattern
<Card
    header={{
        content: <h4>Judul Halaman</h4>,
        extra: (
            <Button
                variant="solid"
                size="sm"
                icon={<HiPlusCircle />}
                onClick={() => router.push(ROUTES.XXX_BARU)}
            >
                Tambah
            </Button>
        ),
        bordered: false,
    }}
    bodyClass="p-0"
>
    <DataTable columns={columns} data={data} loading={loading}
        pagingData={{ pageIndex: page, pageSize, total }}
        onPaginationChange={handlePageChange}
        onSelectChange={handlePageSizeChange}
    />
</Card>
```

**Action buttons** (inside DataTable cell):
```tsx
// Detail/Edit — biru
<span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg
                 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
      onClick={() => router.push(ROUTES.XXX_DETAIL(id))}>
    <HiOutlineEye className="text-lg" />
</span>
```

**Status badge:**
```tsx
// Aktif
'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
// Nonaktif / Dibatalkan
'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'
// In-progress / Berjalan
'bg-blue-100 text-blue-600'
// Pending / Draft
'bg-yellow-100 text-yellow-700'
```

**Column sizes:**
| Column | Size |
|--------|------|
| No (urut) | 70 |
| Nama / teks utama | 280 |
| Kode / ID singkat | 160 |
| Angka / tanggal | 180 |
| Status (badge) | 140 |
| Aksi (icon buttons) | 100 |

### 2b. Form Pages (`/baru`)

```tsx
'use client'
import { Card, Button, FormItem, Input, Select } from '@/components/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HiArrowLeft } from 'react-icons/hi'

<div className="max-w-2xl">
    {/* Back button */}
    <div className="mb-4">
        <Button
            variant="plain"
            size="sm"
            icon={<HiArrowLeft />}
            onClick={() => router.back()}
        >
            Kembali
        </Button>
    </div>

    <Card>
        <h4 className="mb-6">Tambah [Nama]</h4>
        <div className="flex flex-col gap-1">
            <FormItem label="Field" asterisk invalid={!!errors.field} errorMessage={errors.field}>
                <Input
                    placeholder="..."
                    value={form.field}
                    invalid={!!errors.field}
                    onChange={(e) => setForm(p => ({ ...p, field: e.target.value }))}
                />
            </FormItem>
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <Button variant="plain" onClick={() => router.back()}>Batal</Button>
            <Button
                variant="solid"
                customColorClass={() =>
                    'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'
                }
                loading={loading}
                onClick={handleSubmit}
            >
                Simpan
            </Button>
        </div>
    </Card>
</div>
```

### 2c. Detail Pages (`/[id]`)

```tsx
<div className="max-w-2xl">
    {/* Back */}
    <div className="mb-4">
        <Button variant="plain" size="sm" icon={<HiArrowLeft />} onClick={() => router.back()}>
            Kembali
        </Button>
    </div>

    <Card>
        <div className="flex justify-between items-start mb-6">
            <h4>[Nama / ID]</h4>
            <StatusBadge status={data.status} />
        </div>

        {/* Info fields */}
        <div className="flex flex-col gap-3">
            <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Label</span>
                <span className="font-medium">Nilai</span>
            </div>
        </div>

        {/* Edit action */}
        <div className="flex gap-2 mt-6">
            <Button
                variant="solid"
                customColorClass={() =>
                    'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'
                }
                icon={<HiOutlinePencilAlt />}
                onClick={() => setEditing(true)}
            >
                Edit
            </Button>
        </div>
    </Card>
</div>
```

### 2d. Home / Dashboard Page

Use `Card` components for stat cards instead of raw divs. Grid layout 2×2 on mobile, 4 columns on desktop. Each card shows icon + number + label.

### 2e. Toast Notifications

```tsx
import { toast, Notification } from '@/components/ui'

// Sukses
toast.push(<Notification type="success" title="Data berhasil disimpan" />)

// Error
toast.push(<Notification type="danger" title="Gagal menyimpan data" />)
```

Gantikan semua `setError(...)` yang ditampilkan sebagai div merah — gunakan toast untuk error transient, dan tetap tampilkan error validasi field via `FormItem errorMessage`.

---

## 3. Files to Change

### Config (2 files)
| File | Change |
|------|--------|
| `src/configs/theme.config.ts` | `themeSchema: 'green'` |
| `src/configs/navigation-icon.config.tsx` | Add full Pi icon set |

### Feature Pages (25 files)

All pages under `src/app/(protected-pages)/`:

| Module | Pages |
|--------|-------|
| home | `home/page.tsx` |
| armada | `armada/page.tsx`, `armada/baru/page.tsx`, `armada/[id]/page.tsx` |
| supir | `supir/page.tsx`, `supir/baru/page.tsx`, `supir/[id]/page.tsx` |
| project | `project/page.tsx`, `project/baru/page.tsx`, `project/[id]/page.tsx` |
| vendor | `vendor/page.tsx`, `vendor/baru/page.tsx`, `vendor/[id]/page.tsx` |
| faktur | `faktur/page.tsx`, `faktur/baru/page.tsx`, `faktur/[id]/page.tsx` |
| jadwal | `jadwal/page.tsx`, `jadwal/[id]/page.tsx` |
| laporan | `laporan/page.tsx`, `laporan/baru/page.tsx`, `laporan/[id]/page.tsx` |
| rekonsiliasi | `rekonsiliasi/page.tsx`, `rekonsiliasi/[id]/page.tsx` |
| trip | `trip/page.tsx`, `trip/[id]/page.tsx` |

**Total: 25 page files + 2 config files = 27 files**

---

## 4. What Does NOT Change

- Service files (`src/services/*.service.ts`) — logic stays the same
- API proxy route handler
- Auth flow
- Route constants (`ROUTES`)
- API endpoint constants
- Type definitions (`@types/`)
- `src/components/ui/` — never modified (Ecme owned)
- HR-EMPLOYEE-FRONTEND — untouched

---

## 5. Acceptance Criteria

- [ ] Sidebar active items show green highlight
- [ ] All list pages use `Card` + `DataTable` with server-side pagination
- [ ] All form pages use `Card` + `FormItem` + `Input`/`Select` from Ecme
- [ ] Submit buttons are emerald green (`bg-emerald-500`)
- [ ] Cancel/back buttons use `variant="plain"`
- [ ] Status badges follow emerald/red/blue/yellow color scheme
- [ ] Navigation icons render correctly for all sidebar items
- [ ] No raw `<table>`, `<input>`, `<select>`, `<button>` HTML elements in feature pages
- [ ] Toast notifications on save/error using `toast.push(<Notification ... />)`
