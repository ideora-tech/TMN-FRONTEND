# Gabung Perawatan Armada + Interval Perawatan jadi 1 halaman tab

**Tanggal:** 2026-07-25
**Status:** Disetujui

## Latar belakang

Sidebar aplikasi ini dinamis, sumbernya tabel `menu` di backend (bukan file `navigation.config` statis — itu cuma fallback), dirender lewat endpoint `GET /api/v1/menu/tree` dan dikelola lewat halaman Menu Admin. Saat ini "Perawatan Armada" (`/perawatan-armada`) dan "Interval Perawatan" (`/interval-perawatan`) adalah 2 baris menu terpisah di bawah grup "Pemeliharaan".

Permintaan: gabung kedua halaman itu jadi satu halaman dengan 2 tab, dan sidebar cukup punya 1 entri menu bernama "Perawatan Armada".

## Pola yang ditiru

Halaman `/laporan` sudah punya struktur tab yang identik dengan kebutuhan ini: tombol tab di `Card` header (`extra`), tombol aksi page-level yang berganti sesuai tab aktif, dan tab kedua (`LaporanTripTab.tsx`) diekstrak jadi komponen terpisah. Desain ini memakai pola yang sama persis, bukan pola baru.

## Perubahan

### 1. `perawatan-armada/page.tsx` (shell tab)
- Tambah state `tab: 'armada' | 'interval'`, default `'armada'`.
- Inisialisasi dari query param `?tab=interval` (`useSearchParams`) supaya redirect dari form tambah/edit interval otomatis mendarat di tab yang benar.
- Tombol tab di `Card` header, mengikuti persis markup `laporan/page.tsx`.
- Tombol page-level: "Catat Perawatan" cuma tampil saat `tab === 'armada'`; "Tambah Interval" (ke `ROUTES.INTERVAL_PERAWATAN_BARU`) cuma tampil saat `tab === 'interval'`.
- Konten Perawatan Armada yang sudah ada (search, filter armada/status, switcher jatuh tempo, tabel, dialog hapus) dipindah ke bawah kondisi `tab === 'armada'`, isinya tidak diubah.

### 2. File baru `perawatan-armada/IntervalPerawatanTab.tsx`
- Isi `interval-perawatan/page.tsx` saat ini (search, tabel, dialog hapus) dipindah ke sini apa adanya sebagai komponen.
- Judul halaman & tombol "Tambah Interval" TIDAK ikut pindah — itu sudah jadi tanggung jawab page-level shell (poin 1).

### 3. `interval-perawatan/page.tsx` — dihapus
Konten sudah pindah ke `IntervalPerawatanTab.tsx`. Halaman tambah (`interval-perawatan/baru/page.tsx`) dan edit (`interval-perawatan/[id]/page.tsx`) TETAP ADA di path yang sama, tidak diubah — cuma tidak lagi dilink dari sidebar, hanya dari tombol Tambah/Edit di dalam tab.

### 4. `route.constant.ts`
Ubah satu baris:
```
INTERVAL_PERAWATAN: '/interval-perawatan'  →  '/perawatan-armada?tab=interval'
```
`INTERVAL_PERAWATAN_BARU` dan `INTERVAL_PERAWATAN_DETAIL` tidak berubah. Perubahan satu baris ini otomatis membetulkan navigasi balik di `interval-perawatan/baru/page.tsx` dan `interval-perawatan/[id]/page.tsx` (keduanya sudah `router.push(ROUTES.INTERVAL_PERAWATAN)` setelah simpan/batal) tanpa menyentuh isi kedua file itu.

### 5. Data menu (backend)
Soft-delete baris menu "Interval Perawatan" (`id_menu = m0000003-0000-4000-8000-000000000001`) lewat mekanisme yang sama dengan tombol hapus di halaman Menu Admin (`dihapus_pada`/`dihapus_oleh`, bukan hard delete — reversibel). Baris menu "Perawatan Armada" tidak diubah.

## Di luar cakupan
- Tidak ada perubahan backend/API selain soft-delete 1 baris menu di atas.
- URL lama `/interval-perawatan` (list) akan 404 setelah `page.tsx`-nya dihapus — diterima sebagai trade-off (internal admin tool, sudah dikonfirmasi user).

## Verifikasi
- `npx tsc --noEmit` untuk cek tipe (tidak menjalankan `npm run dev`/build — kebijakan user menjalankan itu sendiri).
- Baca-ulang kode manual untuk pastikan tidak ada referensi ke `interval-perawatan/page.tsx` yang tersisa (import, ROUTES lama, dsb).
- User yang verifikasi tampilan akhir di browser.
