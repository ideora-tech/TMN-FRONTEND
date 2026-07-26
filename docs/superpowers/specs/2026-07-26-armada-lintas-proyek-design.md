# Armada Lintas Proyek — status armada digerakkan trip

**Tanggal:** 2026-07-26 · **Status:** Disetujui user (paralel penuh + badge penugasan aktif + relabel "Dalam Perjalanan")

## Aturan baru

1. **Penugasan tidak lagi mengunci armada.** Create/update/delete penugasan tidak menyentuh `armada.status` dan tidak mensyaratkan `tersedia`. 1 armada boleh punya banyak penugasan `pending`/`aktif` lintas proyek. Validasi eksistensi armada tetap.
2. **Status armada = kondisi fisik, digerakkan trip.** `digunakan` di-set saat trip checkin (mulai jalan), balik `tersedia` saat checkout/batalkan-trip-berjalan — hanya bila status saat itu `digunakan` (set manual `perawatan` di tengah trip tidak ditimpa). Berlaku untuk armada internal di penugasan trip tsb; armada vendor tidak punya status.
3. **Guard baru:** checkin (kedua jalur — mulai & manual) ditolak 422 bila armada berstatus `perawatan`/`tidak_aktif`.
4. **Pengaman tabrakan tetap:** 1 armada/supir = 1 trip aktif (lock anti-race), bentrok waktu jadwal, guard penugasan final/tenant (sudah ada, tidak berubah).
5. `releaseArmadaIfUnused`, `hasOtherActiveArmadaUsage`, `assertArmadaTersediaOrFail` (versi wajib-tersedia) pensiun; `selesaikanDariTrip` tidak lagi mengurus armada.

## Frontend

- Label tampilan `digunakan` → **"Dalam Perjalanan"** (display only, enum DB tetap `tersedia|digunakan|perawatan|tidak_aktif`).
- **Badge jumlah penugasan aktif** di list & detail Armada (`Tersedia · 3 penugasan aktif`) — backend menambah `jumlah_penugasan_aktif` (count penugasan pending/aktif per armada) di list & show armada.
- Form penugasan: armada `digunakan` boleh dipilih; hanya `perawatan`/`tidak_aktif` yang dikecualikan (bila ada filter existing).

## Konsekuensi perilaku

- Checkout selalu membebaskan armada secara fisik, terlepas centang "selesaikan penugasan" (checkbox tetap ada, maknanya murni menutup penugasan).
- Test `test_dua_penugasan_tidak_bisa_memakai_armada_yang_sama` dibalik; `PenugasanArmadaLifecycleTest` ditulis ulang ke semantik baru; test sinkron kemarin yang meng-assert armada tetap `digunakan` pasca-checkout disesuaikan.

## Verifikasi

phpunit full suite; tsc+eslint; review adversarial via workflow; user smoke test browser & build sendiri.
