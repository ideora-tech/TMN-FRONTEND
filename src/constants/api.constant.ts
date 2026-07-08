export const API_ENDPOINTS = {
    // Menu
    MENU_TREE: '/api/proxy/menu/tree',

    // Auth
    AUTH_LOGIN:  '/api/proxy/auth/login',
    AUTH_LOGOUT: '/api/proxy/auth/logout',
    AUTH_ME:     '/api/proxy/auth/me',

    // Klien
    KLIEN:        '/api/proxy/klien',
    KLIEN_DETAIL: (id: string) => `/api/proxy/klien/${id}`,

    // Proyek
    PROYEK:        '/api/proxy/proyek',
    PROYEK_DETAIL: (id: string) => `/api/proxy/proyek/${id}`,
    PROYEK_STATUS: (id: string) => `/api/proxy/proyek/${id}/status`,

    // Armada
    ARMADA:        '/api/proxy/armada',
    ARMADA_DETAIL: (id: string) => `/api/proxy/armada/${id}`,

    // Dokumen Armada (nested)
    ARMADA_DOKUMEN:        (idArmada: string) => `/api/proxy/armada/${idArmada}/dokumen`,
    ARMADA_DOKUMEN_UPDATE: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/dokumen/${id}`,
    ARMADA_DOKUMEN_DELETE: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/dokumen/${id}`,

    // Perawatan Armada (nested)
    ARMADA_PERAWATAN:       (idArmada: string) => `/api/proxy/armada/${idArmada}/perawatan`,
    ARMADA_PERAWATAN_DETAIL:(idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}`,

    // Karyawan Exit
    KARYAWAN_EXIT: '/api/proxy/karyawan-exit',

    // Izin Peran
    IZIN_PERAN:        '/api/proxy/izin-peran',
    IZIN_PERAN_BULK:   '/api/proxy/izin-peran/bulk',
    IZIN_PERAN_DETAIL: (id: string) => `/api/proxy/izin-peran/${id}`,

    // Supir
    SUPIR:        '/api/proxy/supir',
    SUPIR_ME:     '/api/proxy/supir/me',
    SUPIR_DETAIL: (id: string) => `/api/proxy/supir/${id}`,

    // Vendor
    VENDOR:        '/api/proxy/vendor',
    VENDOR_DETAIL: (id: string) => `/api/proxy/vendor/${id}`,

    // Kontrak Vendor
    KONTRAK_VENDOR:        '/api/proxy/kontrak-vendor',
    KONTRAK_VENDOR_DETAIL: (id: string) => `/api/proxy/kontrak-vendor/${id}`,

    // Jadwal
    JADWAL:        '/api/proxy/jadwal',
    JADWAL_DETAIL: (id: string) => `/api/proxy/jadwal/${id}`,

    // Trip
    TRIP:          '/api/proxy/trip',
    TRIP_DETAIL:   (id: string) => `/api/proxy/trip/${id}`,
    TRIP_CHECKIN:  (id: string) => `/api/proxy/trip/${id}/checkin`,
    TRIP_CHECKOUT: (id: string) => `/api/proxy/trip/${id}/checkout`,
    TRIP_STATUS:   (id: string) => `/api/proxy/trip/${id}/status`,

    // Laporan Proyek
    LAPORAN:        '/api/proxy/laporan',
    LAPORAN_DETAIL: (id: string) => `/api/proxy/laporan/${id}`,

    // Faktur
    FAKTUR:        '/api/proxy/faktur',
    FAKTUR_DETAIL: (id: string) => `/api/proxy/faktur/${id}`,
    FAKTUR_STATUS: (id: string) => `/api/proxy/faktur/${id}/status`,

    // Rekonsiliasi
    REKONSILIASI:        '/api/proxy/rekonsiliasi',
    REKONSILIASI_DETAIL: (id: string) => `/api/proxy/rekonsiliasi/${id}`,

    // Karyawan
    KARYAWAN:        '/api/proxy/karyawan',
    KARYAWAN_DETAIL: (id: string) => `/api/proxy/karyawan/${id}`,

    // Penugasan
    PENUGASAN:        '/api/proxy/penugasan',
    PENUGASAN_DETAIL: (id: string) => `/api/proxy/penugasan/${id}`,

    // Pengguna
    PENGGUNA:                  '/api/proxy/pengguna',
    PENGGUNA_DETAIL:           (id: string) => `/api/proxy/pengguna/${id}`,
    PENGGUNA_CHANGE_PASSWORD:  (id: string) => `/api/proxy/pengguna/${id}/change-password`,

    // Peran
    PERAN:        '/api/proxy/peran',
    PERAN_DETAIL: (id: string) => `/api/proxy/peran/${id}`,

    // Jenis Kendaraan
    JENIS_KENDARAAN:        '/api/proxy/jenis-kendaraan',
    JENIS_KENDARAAN_DETAIL: (id: string) => `/api/proxy/jenis-kendaraan/${id}`,

    // Lokasi Kantor
    LOKASI_KANTOR:        '/api/proxy/lokasi-kantor',
    LOKASI_KANTOR_DETAIL: (id: string) => `/api/proxy/lokasi-kantor/${id}`,

    // Departemen
    DEPARTEMEN:        '/api/proxy/departemen',
    DEPARTEMEN_DETAIL: (id: string) => `/api/proxy/departemen/${id}`,

    // Jabatan
    JABATAN:        '/api/proxy/jabatan',
    JABATAN_DETAIL: (id: string) => `/api/proxy/jabatan/${id}`,

    // Perusahaan
    PERUSAHAAN:        '/api/proxy/perusahaan',
    PERUSAHAAN_DETAIL: (id: string) => `/api/proxy/perusahaan/${id}`,

    // Menu
    MENU:        '/api/proxy/menu',
    MENU_DETAIL: (id: string) => `/api/proxy/menu/${id}`,

    // Modul
    MODUL:        '/api/proxy/modul',
    MODUL_DETAIL: (id: string) => `/api/proxy/modul/${id}`,

    // Log Error
    LOG_ERROR:        '/api/proxy/log-error',
    LOG_ERROR_DETAIL: (id: string) => `/api/proxy/log-error/${id}`,

    // Dashboard
    DASHBOARD_STATS: '/api/proxy/dashboard/stats',

    // Rute
    RUTE:        '/api/proxy/rute',
    RUTE_DETAIL: (id: string) => `/api/proxy/rute/${id}`,

    // Penawaran
    PENAWARAN:        '/api/proxy/penawaran',
    PENAWARAN_DETAIL: (id: string) => `/api/proxy/penawaran/${id}`,
    PENAWARAN_STATUS: (id: string) => `/api/proxy/penawaran/${id}/status`,

    // Notifikasi
    NOTIFIKASI:       '/api/proxy/notifikasi',
    NOTIFIKASI_BACA:  (id: string) => `/api/proxy/notifikasi/${id}/baca`,
    NOTIFIKASI_BACA_SEMUA: '/api/proxy/notifikasi/baca-semua',

    // Export
    FAKTUR_EXPORT_EXCEL:   '/api/proxy/faktur/export/excel',
    FAKTUR_EXPORT_PDF:     '/api/proxy/faktur/export/pdf',
    LAPORAN_EXPORT_EXCEL:  '/api/proxy/laporan/export/excel',
    LAPORAN_EXPORT_PDF:    '/api/proxy/laporan/export/pdf',
} as const
