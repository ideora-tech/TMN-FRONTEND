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
    PROYEK_RUTE:        (idProyek: string) => `/api/proxy/proyek/${idProyek}/rute`,
    PROYEK_RUTE_DETAIL: (idProyek: string, id: string) => `/api/proxy/proyek/${idProyek}/rute/${id}`,

    // Armada
    ARMADA:        '/api/proxy/armada',
    ARMADA_DETAIL: (id: string) => `/api/proxy/armada/${id}`,

    // Import Armada
    ARMADA_IMPORT_TEMPLATE: '/api/proxy/armada/import/template',
    ARMADA_IMPORT:          '/api/proxy/armada/import',

    // Dokumen Armada (nested)
    ARMADA_DOKUMEN:        (idArmada: string) => `/api/proxy/armada/${idArmada}/dokumen`,
    ARMADA_DOKUMEN_UPDATE: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/dokumen/${id}`,
    ARMADA_DOKUMEN_DELETE: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/dokumen/${id}`,
    DOKUMEN_ARMADA:        '/api/proxy/dokumen-armada',

    // Perawatan Armada (nested)
    ARMADA_PERAWATAN:       (idArmada: string) => `/api/proxy/armada/${idArmada}/perawatan`,
    ARMADA_PERAWATAN_DETAIL:(idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}`,
    ARMADA_PREDIKSI_PERAWATAN: (idArmada: string) => `/api/proxy/armada/${idArmada}/prediksi-perawatan`,
    PERAWATAN_ARMADA:       '/api/proxy/perawatan-armada',

    // Jenis Perawatan
    JENIS_PERAWATAN:        '/api/proxy/jenis-perawatan',
    JENIS_PERAWATAN_DETAIL: (id: string) => `/api/proxy/jenis-perawatan/${id}`,

    // Interval Perawatan
    INTERVAL_PERAWATAN:          '/api/proxy/interval-perawatan',
    INTERVAL_PERAWATAN_DETAIL:   (id: string) => `/api/proxy/interval-perawatan/${id}`,
    INTERVAL_PERAWATAN_RESOLUSI: '/api/proxy/interval-perawatan/resolusi',

    // Badge servis jatuh tempo (armada)
    ARMADA_SERVIS_JATUH_TEMPO: '/api/proxy/armada/servis-jatuh-tempo',

    // Sparepart
    SPAREPART:              '/api/proxy/sparepart',
    SPAREPART_DETAIL:       (id: string) => `/api/proxy/sparepart/${id}`,
    SPAREPART_STOK:         (id: string) => `/api/proxy/sparepart/${id}/stok`,
    SPAREPART_MUTASI:       (id: string) => `/api/proxy/sparepart/${id}/mutasi`,

    // Kategori Sparepart
    KATEGORI_SPAREPART:        '/api/proxy/kategori-sparepart',
    KATEGORI_SPAREPART_DETAIL: (id: string) => `/api/proxy/kategori-sparepart/${id}`,

    // Paket Perawatan Sparepart
    PAKET_PERAWATAN_SPAREPART:          '/api/proxy/paket-perawatan-sparepart',
    PAKET_PERAWATAN_SPAREPART_DETAIL:   (id: string) => `/api/proxy/paket-perawatan-sparepart/${id}`,
    PAKET_PERAWATAN_SPAREPART_RESOLUSI: '/api/proxy/paket-perawatan-sparepart/resolusi',

    // Shift
    SHIFT:        '/api/proxy/shift',
    SHIFT_DETAIL: (id: string) => `/api/proxy/shift/${id}`,

    // Jadwal Shift
    JADWAL_SHIFT:        '/api/proxy/jadwal-shift',
    JADWAL_SHIFT_DETAIL: (id: string) => `/api/proxy/jadwal-shift/${id}`,

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

    // Import Supir
    SUPIR_IMPORT_TEMPLATE: '/api/proxy/supir/import/template',
    SUPIR_IMPORT:          '/api/proxy/supir/import',

    // Vendor
    VENDOR:        '/api/proxy/vendor',
    VENDOR_DETAIL: (id: string) => `/api/proxy/vendor/${id}`,

    // Kontrak Vendor
    KONTRAK_VENDOR:        '/api/proxy/kontrak-vendor',
    KONTRAK_VENDOR_DETAIL: (id: string) => `/api/proxy/kontrak-vendor/${id}`,

    // Trip
    TRIP:          '/api/proxy/trip',
    TRIP_MULAI:    '/api/proxy/trip/mulai',
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

    // Trip lanjutan
    TRIP_REKAP_BIAYA:        (id: string) => `/api/proxy/trip/${id}/rekap-biaya`,
    TRIP_BATALKAN:           (id: string) => `/api/proxy/trip/${id}/batalkan`,
    TRIP_LAPORAN_PERJALANAN: (idTrip: string) => `/api/proxy/trip/${idTrip}/laporan-perjalanan`,
    LAPORAN_PERJALANAN_DETAIL: (id: string) => `/api/proxy/laporan-perjalanan/${id}`,
    LAPORAN_PERJALANAN_FOTO:   (id: string) => `/api/proxy/laporan-perjalanan/${id}/foto`,
    LAPORAN_PERJALANAN_FOTO_DELETE: (id: string, idFoto: string) => `/api/proxy/laporan-perjalanan/${id}/foto/${idFoto}`,

    // Dokumen Vendor
    VENDOR_DOKUMEN:        (idVendor: string) => `/api/proxy/vendor/${idVendor}/dokumen`,
    VENDOR_DOKUMEN_UPDATE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/dokumen/${id}`,
    VENDOR_DOKUMEN_DELETE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/dokumen/${id}`,

    // Penawaran PDF
    PENAWARAN_PDF: (id: string) => `/api/proxy/penawaran/${id}/pdf`,

    // Laporan Operasional
    LAPORAN_TRIP:           '/api/proxy/laporan/trip',
    LAPORAN_TRIP_RINGKASAN: '/api/proxy/laporan/trip/ringkasan',
    LAPORAN_TRIP_EXPORT_EXCEL: '/api/proxy/laporan/trip/export/excel',
    LAPORAN_TRIP_EXPORT_PDF:   '/api/proxy/laporan/trip/export/pdf',
    LAPORAN_KARYAWAN_EXPORT_EXCEL: '/api/proxy/laporan/karyawan/export/excel',
    LAPORAN_KARYAWAN_EXPORT_PDF:   '/api/proxy/laporan/karyawan/export/pdf',
    LAPORAN_ARMADA_EXPORT_EXCEL:   '/api/proxy/laporan/armada/export/excel',
    LAPORAN_ARMADA_EXPORT_PDF:     '/api/proxy/laporan/armada/export/pdf',

    // Klien (riwayat proyek)
    KLIEN_PROYEK: (id: string) => `/api/proxy/klien/${id}/proyek`,

    // Armada Vendor
    ARMADA_VENDOR:        '/api/proxy/armada-vendor',
    ARMADA_VENDOR_DETAIL: (id: string) => `/api/proxy/armada-vendor/${id}`,

    // Supir Vendor
    SUPIR_VENDOR:        '/api/proxy/supir-vendor',
    SUPIR_VENDOR_DETAIL: (id: string) => `/api/proxy/supir-vendor/${id}`,

    // Lokasi
    LOKASI:        '/api/proxy/lokasi',
    LOKASI_DETAIL: (id: string) => `/api/proxy/lokasi/${id}`,

    // Jenis BBM
    JENIS_BBM:        '/api/proxy/jenis-bbm',
    JENIS_BBM_DETAIL: (id: string) => `/api/proxy/jenis-bbm/${id}`,
    JENIS_BBM_HARGA:  (id: string) => `/api/proxy/jenis-bbm/${id}/harga`,

    // Tarif Rute
    TARIF_RUTE:              '/api/proxy/tarif-rute',
    TARIF_RUTE_DETAIL:       (id: string) => `/api/proxy/tarif-rute/${id}`,
    TARIF_RUTE_RESOLUSI:     '/api/proxy/tarif-rute/resolusi',
    TARIF_RUTE_ESTIMASI_BOK: '/api/proxy/tarif-rute/estimasi-bok',

    // Parameter BOK
    PARAMETER_BOK:        '/api/proxy/parameter-bok',
    PARAMETER_BOK_DETAIL: (id: string) => `/api/proxy/parameter-bok/${id}`,
} as const
