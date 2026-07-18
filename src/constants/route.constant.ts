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
    PERAWATAN_ARMADA: '/perawatan-armada',
    DOKUMEN_ARMADA:   '/dokumen-armada',
    PERAWATAN_ARMADA_BARU:   '/perawatan-armada/baru',
    PERAWATAN_ARMADA_DETAIL: (id: string) => `/perawatan-armada/${id}`,
    JENIS_PERAWATAN:        '/jenis-perawatan',
    JENIS_PERAWATAN_BARU:   '/jenis-perawatan/baru',
    JENIS_PERAWATAN_DETAIL: (id: string) => `/jenis-perawatan/${id}`,
    SPAREPART:              '/sparepart',
    SPAREPART_BARU:         '/sparepart/baru',
    SPAREPART_DETAIL:       (id: string) => `/sparepart/${id}`,

    SHIFT:        '/shift',
    SHIFT_BARU:   '/shift/baru',
    SHIFT_DETAIL: (id: string) => `/shift/${id}`,

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

    PENGGUNA:        '/pengguna',
    PENGGUNA_BARU:   '/pengguna/baru',
    PENGGUNA_DETAIL: (id: string) => `/pengguna/${id}`,

    PERAN:        '/peran',
    PERAN_BARU:   '/peran/baru',
    PERAN_DETAIL: (id: string) => `/peran/${id}`,

    JENIS_KENDARAAN:        '/jenis-kendaraan',
    JENIS_KENDARAAN_BARU:   '/jenis-kendaraan/baru',
    JENIS_KENDARAAN_DETAIL: (id: string) => `/jenis-kendaraan/${id}`,

    LOKASI_KANTOR:        '/lokasi-kantor',
    LOKASI_KANTOR_BARU:   '/lokasi-kantor/baru',
    LOKASI_KANTOR_DETAIL: (id: string) => `/lokasi-kantor/${id}`,

    KONTRAK_VENDOR:        '/kontrak-vendor',
    KONTRAK_VENDOR_BARU:   '/kontrak-vendor/baru',
    KONTRAK_VENDOR_DETAIL: (id: string) => `/kontrak-vendor/${id}`,

    DEPARTEMEN:        '/departemen',
    DEPARTEMEN_BARU:   '/departemen/baru',
    DEPARTEMEN_DETAIL: (id: string) => `/departemen/${id}`,

    JABATAN:        '/jabatan',
    JABATAN_BARU:   '/jabatan/baru',
    JABATAN_DETAIL: (id: string) => `/jabatan/${id}`,

    KARYAWAN:        '/karyawan',
    KARYAWAN_BARU:   '/karyawan/baru',
    KARYAWAN_DETAIL: (id: string) => `/karyawan/${id}`,

    PENUGASAN:        '/penugasan',
    PENUGASAN_BARU:   '/penugasan/baru',
    PENUGASAN_DETAIL: (id: string) => `/penugasan/${id}`,

    PERUSAHAAN:        '/perusahaan',
    PERUSAHAAN_BARU:   '/perusahaan/baru',
    PERUSAHAAN_DETAIL: (id: string) => `/perusahaan/${id}`,

    MENU_ADMIN:        '/menu-admin',
    MENU_ADMIN_BARU:   '/menu-admin/baru',
    MENU_ADMIN_DETAIL: (id: string) => `/menu-admin/${id}`,

    LOG_ERROR:        '/log-error',
    LOG_ERROR_DETAIL: (id: string) => `/log-error/${id}`,

    RUTE:        '/rute',
    RUTE_BARU:   '/rute/baru',
    RUTE_DETAIL: (id: string) => `/rute/${id}`,

    PENAWARAN:        '/penawaran',
    PENAWARAN_BARU:   '/penawaran/baru',
    PENAWARAN_DETAIL: (id: string) => `/penawaran/${id}`,

    ARMADA_VENDOR:        '/armada-vendor',
    ARMADA_VENDOR_BARU:   '/armada-vendor/baru',
    ARMADA_VENDOR_DETAIL: (id: string) => `/armada-vendor/${id}`,

    SUPIR_VENDOR:        '/supir-vendor',
    SUPIR_VENDOR_BARU:   '/supir-vendor/baru',
    SUPIR_VENDOR_DETAIL: (id: string) => `/supir-vendor/${id}`,

    LOKASI:        '/lokasi',
    LOKASI_BARU:   '/lokasi/baru',
    LOKASI_DETAIL: (id: string) => `/lokasi/${id}`,

    JENIS_BBM:        '/jenis-bbm',
    JENIS_BBM_BARU:   '/jenis-bbm/baru',
    JENIS_BBM_DETAIL: (id: string) => `/jenis-bbm/${id}`,

    PENUGASAN_VENDOR:      '/penugasan-vendor',
    PENUGASAN_VENDOR_BARU: '/penugasan-vendor/baru',

    TARIF_RUTE:        '/tarif-rute',
    TARIF_RUTE_BARU:   '/tarif-rute/baru',
    TARIF_RUTE_DETAIL: (id: string) => `/tarif-rute/${id}`,

    PARAMETER_BOK:        '/parameter-bok',
    PARAMETER_BOK_BARU:   '/parameter-bok/baru',
    PARAMETER_BOK_DETAIL: (id: string) => `/parameter-bok/${id}`,
} as const
