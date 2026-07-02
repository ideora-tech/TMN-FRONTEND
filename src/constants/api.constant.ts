export const API_ENDPOINTS = {
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
} as const
