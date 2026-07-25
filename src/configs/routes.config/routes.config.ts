import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'

const listRoute = (path: string, key: string, authority: string[] = []): Routes => ({
    [`/${path}`]: { key, authority },
    [`/${path}/baru`]: { key, authority },
    [`/${path}/[id]`]: { key, authority, dynamicRoute: true },
})

const ADMIN_ONLY = ['manager', 'admin', 'superadmin']

export const protectedRoutes: Routes = {
    '/home': {
        key: 'home',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    ...listRoute('klien', 'klien'),
    ...listRoute('project', 'project'),
    ...listRoute('penawaran', 'penawaran'),
    ...listRoute('armada', 'armada'),
    ...listRoute('perawatan-armada', 'perawatan-armada'),
    '/dokumen-armada':   { key: 'dokumen-armada', authority: [] },
    ...listRoute('jenis-perawatan', 'jenis-perawatan'),
    ...listRoute('interval-perawatan', 'interval-perawatan'),
    ...listRoute('sparepart', 'sparepart'),
    ...listRoute('shift', 'shift'),
    ...listRoute('supir', 'supir'),
    ...listRoute('vendor', 'vendor'),
    ...listRoute('kontrak-vendor', 'kontrak-vendor'),
    ...listRoute('armada-vendor', 'armada-vendor'),
    ...listRoute('supir-vendor', 'supir-vendor'),
    ...listRoute('rute', 'rute'),
    '/trip': { key: 'trip', authority: [] },
    '/trip/[id]': { key: 'trip', authority: [], dynamicRoute: true },
    ...listRoute('penugasan', 'penugasan'),
    '/penugasan-vendor': { key: 'penugasan-vendor', authority: [] },
    '/penugasan-vendor/baru': { key: 'penugasan-vendor', authority: [] },
    ...listRoute('laporan', 'laporan'),
    ...listRoute('faktur', 'faktur'),
    ...listRoute('rekonsiliasi', 'rekonsiliasi'),
    ...listRoute('pengguna', 'pengguna', ADMIN_ONLY),
    ...listRoute('peran', 'peran', ADMIN_ONLY),
    ...listRoute('jenis-kendaraan', 'jenis-kendaraan'),
    ...listRoute('lokasi-kantor', 'lokasi-kantor'),
    ...listRoute('lokasi', 'lokasi'),
    ...listRoute('jenis-bbm', 'jenis-bbm'),
    ...listRoute('parameter-bok', 'parameter-bok', ADMIN_ONLY),
    ...listRoute('departemen', 'departemen'),
    ...listRoute('jabatan', 'jabatan'),
    ...listRoute('karyawan', 'karyawan'),
    ...listRoute('perusahaan', 'perusahaan', ADMIN_ONLY),
    ...listRoute('menu-admin', 'menu-admin', ADMIN_ONLY),
    '/log-error': { key: 'log-error', authority: [] },
    '/log-error/[id]': { key: 'log-error', authority: [], dynamicRoute: true },
}

export const publicRoutes: Routes = {
    '/': { key: 'landing', authority: [] },
}

export const authRoutes = authRoute
