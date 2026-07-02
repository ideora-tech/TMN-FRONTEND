export const ROUTES = {
    HOME:     '/',
    SIGN_IN:  '/sign-in',

    KLIEN:        '/klien',
    KLIEN_BARU:   '/klien/baru',
    KLIEN_DETAIL: (id: string) => `/klien/${id}`,

    PROYEK:        '/project',
    PROYEK_BARU:   '/project/baru',
    PROYEK_DETAIL: (id: string) => `/project/${id}`,

    ARMADA:        '/armada',
    ARMADA_BARU:   '/armada/baru',
    ARMADA_DETAIL: (id: string) => `/armada/${id}`,

    SUPIR:        '/supir',
    SUPIR_BARU:   '/supir/baru',
    SUPIR_DETAIL: (id: string) => `/supir/${id}`,

    VENDOR:        '/vendor',
    VENDOR_BARU:   '/vendor/baru',
    VENDOR_DETAIL: (id: string) => `/vendor/${id}`,

    JADWAL:        '/jadwal',
    JADWAL_DETAIL: (id: string) => `/jadwal/${id}`,

    TRIP:        '/trip',
    TRIP_DETAIL: (id: string) => `/trip/${id}`,

    LAPORAN:        '/laporan',
    LAPORAN_BARU:   '/laporan/baru',
    LAPORAN_DETAIL: (id: string) => `/laporan/${id}`,

    FAKTUR:        '/faktur',
    FAKTUR_BARU:   '/faktur/baru',
    FAKTUR_DETAIL: (id: string) => `/faktur/${id}`,

    REKONSILIASI:        '/rekonsiliasi',
    REKONSILIASI_BARU:   '/rekonsiliasi/baru',
    REKONSILIASI_DETAIL: (id: string) => `/rekonsiliasi/${id}`,
} as const
