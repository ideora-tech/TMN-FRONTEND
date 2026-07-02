# Task 5–14 Report: Frontend Feature Pages

**Status:** COMPLETE  
**TypeScript errors:** 0  

---

## Files Created

### Services (9 files)
| File | Module |
|------|--------|
| `src/services/project.service.ts` | Task 5 — Project |
| `src/services/armada.service.ts` | Task 6 — Armada |
| `src/services/supir.service.ts` | Task 7 — Supir |
| `src/services/vendor.service.ts` | Task 8 — Vendor (includes KontrakVendor) |
| `src/services/jadwal.service.ts` | Task 9 — Jadwal |
| `src/services/trip.service.ts` | Task 10 — Trip |
| `src/services/laporan.service.ts` | Task 11 — Laporan |
| `src/services/faktur.service.ts` | Task 12 — Faktur |
| `src/services/rekonsiliasi.service.ts` | Task 13 — Rekonsiliasi |

### Pages (27 files)

#### Task 5 — Project (`/project`)
- `src/app/(protected-pages)/project/page.tsx` — Paginated list, status badges (penawaran/disetujui/berjalan/selesai/dibatalkan)
- `src/app/(protected-pages)/project/baru/page.tsx` — Create form
- `src/app/(protected-pages)/project/[id]/page.tsx` — Detail + status update dropdown

#### Task 6 — Armada (`/armada`)
- `src/app/(protected-pages)/armada/page.tsx` — Paginated list, status badges (aktif/servis/nonaktif)
- `src/app/(protected-pages)/armada/baru/page.tsx` — Create form
- `src/app/(protected-pages)/armada/[id]/page.tsx` — View/edit toggle

#### Task 7 — Supir (`/supir`)
- `src/app/(protected-pages)/supir/page.tsx` — List with SIM expiry warning (<30 days = red)
- `src/app/(protected-pages)/supir/baru/page.tsx` — Create form
- `src/app/(protected-pages)/supir/[id]/page.tsx` — Detail with SIM alert banner + edit form

#### Task 8 — Vendor (`/vendor`)
- `src/app/(protected-pages)/vendor/page.tsx` — Paginated list
- `src/app/(protected-pages)/vendor/baru/page.tsx` — Create form
- `src/app/(protected-pages)/vendor/[id]/page.tsx` — Detail + kontrak list + inline add-kontrak form (mekanisme dropdown: unit_only/unit_driver/full)

#### Task 9 — Jadwal (`/jadwal`)
- `src/app/(protected-pages)/jadwal/page.tsx` — List with status badges
- `src/app/(protected-pages)/jadwal/[id]/page.tsx` — Detail + trip status history (auto-fetched, silently ignored if no trip)

#### Task 10 — Trip (`/trip`)
- `src/app/(protected-pages)/trip/page.tsx` — List with check-in/out times
- `src/app/(protected-pages)/trip/[id]/page.tsx` — Detail + auto-refreshing status history (setInterval 30s)

#### Task 11 — Laporan (`/laporan`)
- `src/app/(protected-pages)/laporan/page.tsx` — List with total_trip, diserahkan_pada
- `src/app/(protected-pages)/laporan/baru/page.tsx` — Create form (id_proyek + ringkasan)
- `src/app/(protected-pages)/laporan/[id]/page.tsx` — Detail view

#### Task 12 — Faktur (`/faktur`)
- `src/app/(protected-pages)/faktur/page.tsx` — List with formatRupiah(total), status badges
- `src/app/(protected-pages)/faktur/baru/page.tsx` — Create form with dynamic items table (auto-subtotal per row)
- `src/app/(protected-pages)/faktur/[id]/page.tsx` — Detail + items table + contextual status buttons (Kirim/Lunas/Batal)

#### Task 13 — Rekonsiliasi (`/rekonsiliasi`)
- `src/app/(protected-pages)/rekonsiliasi/page.tsx` — List + inline create form (pending=yellow, selesai=green)
- `src/app/(protected-pages)/rekonsiliasi/[id]/page.tsx` — Detail with catatan_klien/catatan_keuangan + Tandai Selesai action

#### Task 14 — Dashboard (`/home`) — Updated
- `src/app/(protected-pages)/home/page.tsx` — 4-card stats grid (Trip Berjalan, Armada Aktif, Proyek Berjalan, Faktur Draft) via parallel axios calls

---

## Implementation Notes

- All pages use `'use client'` + `useState` + `useEffect` pattern
- All API calls via `axios` through `/api/proxy/*` (never hardcoded backend URL)
- `parseApiError` from `@/utils/error.util` used for all error display
- `formatRupiah` from `@/utils/formatNumber` used for money values
- `API_ENDPOINTS` and `ROUTES` constants used throughout (no hardcoded strings)
- Pagination implemented on all list pages with Prev/Next buttons
- Boolean MySQL values handled at the service layer where applicable
