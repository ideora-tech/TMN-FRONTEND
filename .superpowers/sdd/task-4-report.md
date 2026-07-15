# Task 4 Report — Halaman Penugasan Vendor + Penugasan Lama Internal-Only

**Status:** COMPLETE

## tsc / lint
- `npx tsc --noEmit` → exit 0, tanpa error.
- `npx eslint` pada semua file yang diubah/dibuat → exit 0, tanpa warning.

## Files Changed

### Modified
- `src/services/penugasan.service.ts` — tambah `SumberPenugasan` type, field `sumber` / `id_kontrak_vendor` / `id_armada_vendor` / `id_supir_vendor` di interface `Penugasan`, param opsional `sumber` di `list()`, dan field vendor opsional di payload `create()`.
- `src/app/(protected-pages)/penugasan/page.tsx` — `penugasanService.list(selectedProyek, currentPage, 'internal')`; tambah baris info abu kecil + `Link` "Penugasan vendor dikelola di menu Operasional Vendor →" ke `ROUTES.PENUGASAN_VENDOR`.
- `src/app/(protected-pages)/penugasan/[id]/page.tsx` — view-mode: bila `sumber==='vendor'` tampil seksi "Sumber Vendor" (Kontrak sebagai Tag mekanisme, Armada Vendor nopol, Supir Vendor nama — fallback id pendek font-mono bila lookup gagal) + catatan kecil mengarah ke Operasional Vendor. Edit-mode tidak diubah sama sekali (field vendor memang tidak pernah ada di form edit ini).

### Created
- `src/app/(protected-pages)/penugasan-vendor/page.tsx` — list, filter proyek wajib (lihat keputusan di bawah) + `sumber=vendor`.
- `src/app/(protected-pages)/penugasan-vendor/baru/page.tsx` — form create Proyek → Vendor → Kontrak (Tag mekanisme muncul setelah pilih) → field kondisional (unit_only: Armada Vendor + Supir internal; unit_driver/full: Armada Vendor + Supir Vendor) → Tanggal + Estimasi Biaya.

ROUTES/API_ENDPOINTS/navigation.config/routes.config untuk `penugasan-vendor` sudah ada dari task sebelumnya — tidak diubah.

## Keputusan Penting (baca sebelum review)

**1. Backend `GET /penugasan` TIDAK punya mode "list semua by sumber" tanpa filter.** Cek nyata `PenugasanController::index()`: selalu mensyaratkan salah satu dari `id_proyek` / `id_armada` / `id_supir`, kalau tidak ada → abort 422. `sumber` hanya filter tambahan di atas salah satu itu (dikonfirmasi oleh `PenugasanVendorTest::test_filter_sumber_vendor_hanya_mengembalikan_baris_vendor` yang selalu mengirim `id_proyek` bersama `sumber`). Jadi halaman `penugasan-vendor` **meniru pola halaman `penugasan` yang sudah ada**: Select Proyek dulu (wajib), baru tabel terisi via `penugasanService.list(idProyek, page, 'vendor')`. Ini bukan penyimpangan dari brief — brief mengasumsikan filter `sumber` berdiri sendiri, tapi kontrak API nyata tidak mendukung itu.

**2. Kolom list didasarkan pada shape nyata `PenugasanResource.php`** (dicek langsung di backend): resource hanya mengembalikan id mentah (`id_kontrak_vendor`, `id_armada_vendor`, `id_supir_vendor`, `id_supir`), tanpa nama proyek/vendor/mekanisme. Kolom Vendor/Mekanisme/Unit/Supir diturunkan dengan lookup map dari data master yang sudah ada (kontrak-vendor, vendor, armada-vendor, supir-vendor, supir) — bukan fabrikasi, tapi join client-side dari data asli. Fallback id pendek (8 karakter, font-mono) dipakai kalau lookup belum ke-load / record sudah dihapus.

**3. Gap backend ditemukan (di luar scope Task 4, tidak disentuh):** `KontrakVendorController::index()` tidak menerapkan filter `?id_vendor=` sama sekali (hanya baca `page`/`limit`) — beda dengan `ArmadaVendorController`/`SupirVendorController` yang benar-benar filter server-side. Akibatnya endpoint kontrak-vendor selalu mengembalikan semua kontrak milik perusahaan. Frontend (list & form create) mengambil kontrak sekali (`limit:100`) lalu **filter `id_vendor` di client-side** untuk tetap benar. Halaman `vendor/[id]/page.tsx` yang sudah ada dari task sebelumnya punya gap yang sama (di luar scope saya).

**4. `kontrak-vendor.service.ts` (field `id_kontrak_vendor`) dipakai** sebagai sumber kebenaran — bukan `vendor.service.ts`'s embedded `KontrakVendor` (field `id_kontrak`, tidak match resource asli). Duplikasi tipe ini pre-existing, tidak disentuh.

**5. Aksi list `penugasan-vendor` hanya ikon mata** (sesuai brief eksplisit) — tidak ada delete di halaman ini, beda dari `penugasan/page.tsx` yang punya delete.

## Concerns
- Lookup map vendor/armada-vendor/supir-vendor/kontrak-vendor di list page memakai `limit:100`/`limit:15` (mengikuti konvensi existing di codebase, misal `armadaService.list(1)` di `penugasan/page.tsx`) — kalau data master > limit tsb, sebagian baris akan fallback ke id pendek. Bukan regresi baru, hanya limitasi konvensi lama.
- Backend `KontrakVendorController` id_vendor filter gap (poin 3) sebaiknya diperbaiki di sisi backend agar frontend tidak perlu over-fetch + filter client-side.
