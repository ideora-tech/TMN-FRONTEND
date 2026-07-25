# Gabung Perawatan Armada + Interval Perawatan (Tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gabung halaman List Interval Perawatan ke dalam halaman Perawatan Armada sebagai tab kedua, dan sisakan satu entri menu sidebar bernama "Perawatan Armada".

**Architecture:** Ikuti pola tab yang sudah ada di `laporan/page.tsx` persis: `Card` header punya tombol tab, konten tab kedua diekstrak jadi komponen mandiri tanpa Card pembungkus sendiri (mirip `LaporanTripTab.tsx`), tombol aksi page-level berganti sesuai tab aktif.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Ecme UI components. Backend: Laravel (hanya 1 aksi data, tidak ada perubahan kode backend).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-perawatan-armada-interval-tab-merge-design.md`
- **DILARANG membuat git commit** — user commit manual sendiri (bukan bagian dari task ini sama sekali, tidak ada langkah "Commit" di plan ini).
- **DILARANG menjalankan `npm run dev`/`npm run build`/docker build** — user jalankan sendiri. Verifikasi pakai `npx tsc --noEmit` dan baca-ulang kode manual.
- Tidak ada test framework frontend terpasang di repo ini (cuma `npm run lint`/`npm run build`) — jadi task di bawah tidak pakai siklus TDD gaya `pytest`, diganti dengan langkah "buat perubahan → verifikasi lewat tsc + review manual".
- Jangan tulis komentar penjelas di kode (konvensi proyek).
- Semua teks UI tetap bahasa Indonesia, disalin apa adanya dari file asal — jangan diubah kata-katanya.
- File `interval-perawatan/baru/page.tsx` dan `interval-perawatan/[id]/page.tsx` TIDAK disentuh sama sekali di plan ini (sudah otomatis benar lewat Task 2).

---

### Task 1: Ekstrak `IntervalPerawatanTab.tsx`

**Files:**
- Create: `src/app/(protected-pages)/perawatan-armada/IntervalPerawatanTab.tsx`
- Reference (baca, jangan diubah): `src/app/(protected-pages)/interval-perawatan/page.tsx` (isi sumber), `src/app/(protected-pages)/laporan/LaporanTripTab.tsx` (pola struktur — komponen mandiri, tanpa Card pembungkus sendiri, `export default function NamaTab()` tanpa props)

**Interfaces:**
- Produces: `export default function IntervalPerawatanTab()` — komponen React tanpa props, dipakai oleh Task 3.

- [ ] **Step 1: Buat file `IntervalPerawatanTab.tsx` berisi salinan logic dari `interval-perawatan/page.tsx`**

Salin seluruh isi `interval-perawatan/page.tsx` ke file baru, dengan perubahan:
1. Ganti nama fungsi `IntervalPerawatanPage` → `IntervalPerawatanTab`.
2. Hapus blok judul halaman page-level (`<div className="flex items-center justify-between">...<h3>Interval Perawatan</h3>...<Button ...>Tambah Interval</Button></div>`) — ini pindah ke `perawatan-armada/page.tsx` di Task 3.
3. Hapus import `HiPlusCircle` (cuma dipakai tombol Tambah Interval yang sudah dihapus) — cek dulu tidak dipakai di tempat lain dalam file.
4. Return statement jadi langsung `<div className="flex flex-col gap-4">` berisi `<Card bodyClass="p-0">...</Card>` dan `<ConfirmDialog .../>` — TANPA div judul di atasnya (karena parent `perawatan-armada/page.tsx` sudah membungkus dengan Card header + tab sendiri, komponen ini cukup render Card-nya sendiri persis seperti pola `interval-perawatan/page.tsx` asli, HANYA blok judul+tombol yang dibuang).

Hasil akhirnya:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { intervalPerawatanService, IntervalPerawatan } from '@/services/intervalPerawatan.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

export default function IntervalPerawatanTab() {
    const router = useRouter()
    const [list, setList] = useState<IntervalPerawatan[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(10)

    const [deleteTarget, setDeleteTarget] = useState<IntervalPerawatan | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await intervalPerawatanService.list({ page: currentPage, limit: pageSize, search })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await intervalPerawatanService.delete(deleteTarget.id_interval_perawatan)
            toast.push(<Notification type="success" title="Interval perawatan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<IntervalPerawatan>[] = [
        {
            header: 'No',
            id: 'no',
            size: 60,
            cell: (props: CellContext<IntervalPerawatan, unknown>) =>
                (currentPage - 1) * pageSize + props.row.index + 1,
        },
        {
            header: 'Jenis Perawatan',
            accessorKey: 'nama_jenis_perawatan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => props.row.original.nama_jenis_perawatan ?? '—',
        },
        {
            header: 'Jenis Kendaraan',
            accessorKey: 'nama_jenis_kendaraan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => props.row.original.nama_jenis_kendaraan ?? '—',
        },
        {
            header: 'Interval',
            accessorKey: 'interval_hari',
            cell: (props: CellContext<IntervalPerawatan, unknown>) =>
                `${formatNum(props.row.original.interval_hari)} hari`,
        },
        {
            header: '',
            accessorKey: 'id_interval_perawatan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN_DETAIL(row.id_interval_perawatan))}
                            ><HiOutlinePencilAlt className="text-base" /></span>
                        </Tooltip>
                        <Tooltip title="Hapus">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                onClick={() => setDeleteTarget(row)}
                            ><HiOutlineTrash className="text-base" /></span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari jenis perawatan atau jenis kendaraan... (tekan Enter)"
                            suffix={
                                searchInput
                                    ? <HiOutlineX className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                    : <HiOutlineSearch className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                            }
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns as ColumnDef<unknown>[]}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSort={() => {}}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                    selectable={false}
                />
            </Card>
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Interval Perawatan?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Interval untuk <span className="font-semibold">&ldquo;{deleteTarget?.nama_jenis_perawatan}&rdquo;</span> ({deleteTarget?.nama_jenis_kendaraan}) akan dihapus. Reminder servis untuk kombinasi ini tidak akan terhitung otomatis lagi. Lanjutkan?
                </p>
            </ConfirmDialog>
        </>
    )
}
```

Catatan penting: komponen ini me-return `<>...</>` (fragment, BUKAN `<div className="flex flex-col gap-4">`) karena `ConfirmDialog` dirender sebagai portal/overlay — mengikuti pola persis bagaimana `Card` + `ConfirmDialog` jadi sibling di file asal `interval-perawatan/page.tsx`, cuma dibungkus fragment alih-alih div page-level (div page-level itu tanggung jawab parent di Task 3).

- [ ] **Step 2: Verifikasi tidak ada import yang tidak terpakai**

Baca ulang file, pastikan `HiPlusCircle` tidak diimport (sudah dihapus di Step 1), dan semua import lain (`useRouter`, `ROUTES`, dst) tetap dipakai.

---

### Task 2: Ubah `ROUTES.INTERVAL_PERAWATAN`

**Files:**
- Modify: `src/constants/route.constant.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces: `ROUTES.INTERVAL_PERAWATAN` sekarang bernilai `/perawatan-armada?tab=interval` — dipakai oleh `interval-perawatan/baru/page.tsx` dan `interval-perawatan/[id]/page.tsx` yang sudah ada (tidak diubah), dan oleh Task 3 untuk membaca query param `tab`.

- [ ] **Step 1: Ubah satu baris**

Cari baris:
```ts
INTERVAL_PERAWATAN:        '/interval-perawatan',
```
Ganti jadi:
```ts
INTERVAL_PERAWATAN:        '/perawatan-armada?tab=interval',
```
Baris `INTERVAL_PERAWATAN_BARU` dan `INTERVAL_PERAWATAN_DETAIL` di bawahnya TIDAK diubah.

- [ ] **Step 2: Verifikasi**

Jalankan grep untuk pastikan tidak ada tempat lain di frontend yang hardcode string `/interval-perawatan` (harus selalu lewat `ROUTES.INTERVAL_PERAWATAN*`):
```
grep -rn "'/interval-perawatan'" src/
```
Expected: tidak ada match (semua pemakaian lewat konstanta `ROUTES.*`).

---

### Task 3: Jadikan `perawatan-armada/page.tsx` shell tab

**Files:**
- Modify: `src/app/(protected-pages)/perawatan-armada/page.tsx`

**Interfaces:**
- Consumes: `IntervalPerawatanTab` (default export dari Task 1, tanpa props), `ROUTES.INTERVAL_PERAWATAN_BARU` (sudah ada, tidak berubah)
- Produces: halaman `/perawatan-armada` dengan 2 tab, menerima query param opsional `?tab=interval`

- [ ] **Step 1: Tambah import**

Di bagian atas file, tambahkan:
```ts
import { useSearchParams } from 'next/navigation'
import IntervalPerawatanTab from './IntervalPerawatanTab'
```
(`useRouter` dari `next/navigation` sudah diimport — tambahkan `useSearchParams` di baris import yang sama atau baris terpisah, ikuti gaya existing import di file itu.)

- [ ] **Step 2: Tambah state `tab` dengan inisialisasi dari query param**

Di dalam `export default function PerawatanArmadaPage()`, tepat setelah `const router = useRouter()`, tambahkan:
```ts
const searchParams = useSearchParams()
const [tab, setTab] = useState<'armada' | 'interval'>(
    searchParams.get('tab') === 'interval' ? 'interval' : 'armada'
)
```

- [ ] **Step 3: Ubah blok header page-level supaya tombol aksi berganti sesuai tab**

Cari blok ini (baris ~178-185 di file asal):
```tsx
<div className="flex items-center justify-between">
    <div>
        <h3 className="font-bold">Perawatan Armada</h3>
        <p className="text-gray-500 text-sm mt-0.5">Riwayat perawatan seluruh armada</p>
    </div>
    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.PERAWATAN_ARMADA_BARU)}>Catat Perawatan</Button>
</div>
```
Ganti jadi:
```tsx
<div className="flex items-center justify-between">
    <div>
        <h3 className="font-bold">Perawatan Armada</h3>
        <p className="text-gray-500 text-sm mt-0.5">Riwayat perawatan seluruh armada</p>
    </div>
    {tab === 'armada' ? (
        <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.PERAWATAN_ARMADA_BARU)}>Catat Perawatan</Button>
    ) : (
        <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN_BARU)}>Tambah Interval</Button>
    )}
</div>
```

- [ ] **Step 4: Tambah tombol tab di `Card` header, dan bungkus konten existing dengan kondisi tab**

Cari:
```tsx
<Card bodyClass="p-0">
    <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
```
Ganti pembuka `<Card bodyClass="p-0">` jadi (tambahkan `header` prop, ikuti pola persis `laporan/page.tsx`):
```tsx
<Card
    header={{
        content: <span />,
        extra: (
            <div className="flex items-center gap-2">
                <Button
                    size="sm" variant={tab === 'armada' ? 'solid' : 'default'}
                    onClick={() => setTab('armada')}
                >
                    Perawatan Armada
                </Button>
                <Button
                    size="sm" variant={tab === 'interval' ? 'solid' : 'default'}
                    onClick={() => setTab('interval')}
                >
                    Interval Perawatan
                </Button>
            </div>
        ),
        bordered: false,
    }}
    bodyClass="p-0"
>
    {tab === 'armada' ? (
        <>
            <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
```
Lalu di akhir konten tab armada, cari penutup existing:
```tsx
                <DataTable
                    columns={columns}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>
```
Ganti jadi:
```tsx
                <DataTable
                    columns={columns}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </>
        ) : (
            <IntervalPerawatanTab />
        )}
    </Card>
```

Semua isi di antara (search input, filter armada, filter status, switcher jatuh tempo, `DataTable`) TIDAK berubah sama sekali — cuma dibungkus fragment `<>...</>` di dalam cabang `tab === 'armada'`.

- [ ] **Step 5: Verifikasi struktur JSX valid**

Baca ulang seluruh file dari awal sampai akhir, pastikan setiap `<Card>`, `<>`, dan `</div>` closing tag berpasangan dengan benar (gampang salah taruh kurung saat sisip kondisional). `ConfirmDialog` untuk hapus data perawatan armada tetap di luar `<Card>`, sejajar seperti sebelumnya, tidak terpengaruh perubahan ini.

---

### Task 4: Hapus halaman list Interval Perawatan lama

**Files:**
- Delete: `src/app/(protected-pages)/interval-perawatan/page.tsx`

**Interfaces:**
- Consumes: tidak ada (Task 1 sudah memindahkan seluruh isinya)
- Produces: tidak ada

- [ ] **Step 1: Hapus file**

Hapus `src/app/(protected-pages)/interval-perawatan/page.tsx`. Folder `interval-perawatan/baru/` dan `interval-perawatan/[id]/` TETAP ADA, tidak dihapus.

- [ ] **Step 2: Verifikasi tidak ada import yang patah**

```
grep -rn "app/(protected-pages)/interval-perawatan/page" src/
grep -rn "from '.*interval-perawatan/page'" src/
```
Expected: tidak ada match (tidak ada file lain yang mengimpor halaman ini secara langsung — Next.js App Router routing tidak butuh import manual ke `page.tsx`).

---

### Task 5: Verifikasi tipe & kebersihan referensi

**Files:**
- Tidak ada file diubah di task ini, murni verifikasi.

- [ ] **Step 1: Type-check**

```bash
cd TMN-TRANSPORT-FRONTEND
npx tsc --noEmit
```
Expected: tidak ada error baru terkait `perawatan-armada/page.tsx`, `perawatan-armada/IntervalPerawatanTab.tsx`, atau `route.constant.ts`. (Kalau ada error pre-existing tidak terkait perubahan ini, boleh diabaikan — bukan bagian dari scope task ini.)

- [ ] **Step 2: Grep akhir memastikan tidak ada sisa referensi ke halaman lama**

```bash
grep -rn "IntervalPerawatanPage" src/
```
Expected: tidak ada match (fungsi sudah diganti nama jadi `IntervalPerawatanTab` di Task 1, file lama sudah dihapus di Task 4).

**JANGAN jalankan `npm run dev`/`npm run build`** — user yang verifikasi tampilan akhir di browser sendiri.

---

### Task 6: Soft-delete menu "Interval Perawatan" dari sidebar

**Files:**
- Tidak ada file kode diubah — ini aksi data lewat `php artisan tinker`, mekanisme identik dengan tombol Hapus di halaman Menu Admin (`MenuService::delete()` → `MenuRepository::delete()` → `MenuModel::softDelete()`, mengisi `dihapus_pada` dan `dihapus_oleh` bila ada user terautentikasi).

- [ ] **Step 1: Konfirmasi ID menu yang akan dihapus**

ID sudah dikonfirmasi lewat query database sebelumnya: `m0000003-0000-4000-8000-000000000001` (nama_menu = "Interval Perawatan", path = `/interval-perawatan`, induk = "Pemeliharaan"). Jangan hapus baris menu "Perawatan Armada" (`m0000001-0000-4000-8000-000000000028`) — itu tetap ada, tidak diubah.

- [ ] **Step 2: Jalankan soft-delete lewat service yang sama dengan yang dipakai app**

```bash
cd TMN-TRANSPORT-BACKEND
php artisan tinker --execute="app(\App\Modules\Menu\MenuService::class)->delete('m0000003-0000-4000-8000-000000000001'); echo 'done';"
```
Expected output: `done`, tanpa exception (`findOrFail` di dalam `delete()` akan throw 404 kalau ID salah/sudah terhapus).

- [ ] **Step 3: Verifikasi**

```bash
docker exec tmn_mysql mysql -uhruser -phrpassword123 -e "SELECT nama_menu, dihapus_pada FROM tmn_transport.menu WHERE id_menu = 'm0000003-0000-4000-8000-000000000001';"
```
Expected: `dihapus_pada` terisi timestamp (bukan NULL). Lalu cek sidebar hanya punya 1 entri "Perawatan Armada" di bawah grup Pemeliharaan:
```bash
docker exec tmn_mysql mysql -uhruser -phrpassword123 -e "SELECT nama_menu FROM tmn_transport.menu WHERE id_menu_induk = 'm0000001-0000-4000-8000-000000000080' AND dihapus_pada IS NULL ORDER BY urutan;"
```
Expected: daftar tidak lagi memuat "Interval Perawatan".

**Reversibel:** kalau perlu dikembalikan, jalankan `UPDATE menu SET dihapus_pada = NULL, dihapus_oleh = NULL WHERE id_menu = 'm0000003-0000-4000-8000-000000000001';` lewat mysql yang sama.
