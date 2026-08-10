# Dashboard Gabungan ber-Tab di /home

**Tanggal:** 2026-08-10
**Status:** Disetujui user

## Masalah

- `/home` tampil beda dengan `/dashboard-armada`: background putih dan konten
  menyempit ke tengah, karena meta route `pageBackgroundType: 'plain'` +
  `pageContainerType: 'contained'` di `routes.config.ts`. `/dashboard-armada`
  tanpa meta → background abu-abu default + konten full-width rapat ke tepi.
- Ada dua halaman dashboard terpisah (Dashboard umum di `/home`, Dashboard Armada
  di `/dashboard-armada`). User ingin satu halaman dashboard dengan tab.

## Solusi

### 1. Samakan tampilan

Hapus blok `meta` pada entri `'/home'` di
`src/configs/routes.config/routes.config.ts` → `/home` memakai default yang sama
dengan `/dashboard-armada` (background abu-abu, full-width).

### 2. Gabungkan jadi tab (pola `perawatan-armada/page.tsx`)

- `src/app/(protected-pages)/home/DashboardOperasionalTab.tsx` — seluruh konten
  `/home` sekarang (3 banner alert + grid kartu statistik), fetch
  `DASHBOARD_STATS` sendiri saat mount. Judul halaman tidak ikut (pindah ke page).
- `src/app/(protected-pages)/home/DashboardArmadaTab.tsx` — seluruh konten
  `/dashboard-armada` sekarang (6 kartu + tabel Harus Diservis + Sedang Dalam
  Perawatan), dipindah apa adanya (fetch `armadaService.dashboard()` sendiri).
- `home/page.tsx` baru: judul "Dashboard" + subtitle "Ringkasan operasional TMN
  Transport", lalu `Tabs` dengan `Tabs.TabList`/`Tabs.TabContent`:
  - `operasional` → "Operasional" (default)
  - `armada` → "Armada"
  - Dukung `?tab=armada` via `useSearchParams` (pola perawatan-armada).
- **Tab Armada hanya dirender** bila authority user (lowercase, dari
  `useCurrentSession().session.user.authority`) beririsan dengan
  `['dispatcher', 'manager', 'superadmin', 'admin']` — mengikuti authority menu
  Dashboard Armada saat ini.

### 3. Rute & menu lama

- `dashboard-armada/page.tsx` → hanya `redirect('/home?tab=armada')`
  (`next/navigation`); rute tetap terdaftar di `routes.config.ts` agar tidak 404.
- Hapus item nav `dashboard-armada` dari `src/configs/navigation.config/index.ts`.
- Baris menu `dashboard-armada` di DB menu-akses backend dibiarkan (tidak
  berefek setelah item nav hilang).

## Perilaku Tepi

- Role tanpa akses armada (mis. sales murni) → hanya tab Operasional; buka
  `/dashboard-armada` → redirect ke `/home?tab=armada` → param tab tidak dikenal
  karena tabnya tidak dirender → fallback tab `operasional`.
- Kedua tab fetch data masing-masing; `TabContent` Ecme me-render konten saat
  tab aktif sehingga fetch armada tidak jalan sebelum tab dibuka.

## Testing

- `npm run lint` pada file yang diubah (build & verifikasi visual oleh user).

## Di Luar Cakupan

- Menghapus baris menu dashboard-armada dari seeder/DB backend.
- Perubahan konten/isi dashboard (hanya reorganisasi + latar).
