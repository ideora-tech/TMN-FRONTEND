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
    ...listRoute('armada', 'armada'),
    ...listRoute('supir', 'supir'),
    ...listRoute('vendor', 'vendor'),
    ...listRoute('kontrak-vendor', 'kontrak-vendor'),
    ...listRoute('armada-vendor', 'armada-vendor'),
    ...listRoute('supir-vendor', 'supir-vendor'),
    '/jadwal': { key: 'jadwal', authority: [] },
    '/jadwal/[id]': { key: 'jadwal', authority: [], dynamicRoute: true },
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
