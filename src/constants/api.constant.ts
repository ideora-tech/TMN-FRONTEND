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
    PROYEK_PDF:         (id: string) => `/api/proxy/proyek/${id}/pdf`,
    PROYEK_PENAWARAN_REVISI: (id: string) => `/api/proxy/proyek/${id}/penawaran-revisi`,
    PROYEK_FAKTUR_BORONGAN:  (id: string) => `/api/proxy/proyek/${id}/faktur-borongan`,

    // Armada
    ARMADA:        '/api/proxy/armada',
    ARMADA_DETAIL: (id: string) => `/api/proxy/armada/${id}`,
    ARMADA_DASHBOARD: '/api/proxy/armada/dashboard',

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
    ARMADA_PERAWATAN_BATAL: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}/batal`,
    ARMADA_PERAWATAN_BUKTI: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}/bukti`,
    ARMADA_PERAWATAN_BUKTI_DETAIL: (idArmada: string, id: string, idBukti: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}/bukti/${idBukti}`,
    ARMADA_PERAWATAN_PENGAJUAN: (idArmada: string, id: string) => `/api/proxy/armada/${idArmada}/perawatan/${id}/pengajuan`,
    ARMADA_PREDIKSI_PERAWATAN: (idArmada: string) => `/api/proxy/armada/${idArmada}/prediksi-perawatan`,
    PERAWATAN_ARMADA:       '/api/proxy/perawatan-armada',
    PERAWATAN_REKAP_PER_UNIT: '/api/proxy/perawatan-armada/rekap-per-unit',
    PERAWATAN_REKAP_EXPORT: (format: 'excel' | 'pdf') => `/api/proxy/perawatan-armada/rekap-per-unit/export/${format}`,
    ARMADA_PERAWATAN_EXPORT: (idArmada: string, format: 'excel' | 'pdf') => `/api/proxy/armada/${idArmada}/perawatan/export/${format}`,

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

    // Supplier
    SUPPLIER:        '/api/proxy/supplier',
    SUPPLIER_DETAIL: (id: string) => `/api/proxy/supplier/${id}`,

    // Pembelian Sparepart
    PEMBELIAN_SPAREPART:                 '/api/proxy/pembelian-sparepart',
    PEMBELIAN_SPAREPART_LAPORAN:         '/api/proxy/pembelian-sparepart/laporan',
    PEMBELIAN_SPAREPART_LAPORAN_EXPORT:  (format: 'excel' | 'pdf') => `/api/proxy/pembelian-sparepart/laporan/export/${format}`,
    PEMBELIAN_SPAREPART_DETAIL:          (id: string) => `/api/proxy/pembelian-sparepart/${id}`,
    PEMBELIAN_SPAREPART_REALISASI:       (id: string) => `/api/proxy/pembelian-sparepart/${id}/realisasi`,
    PEMBELIAN_SPAREPART_BUKTI:           (id: string) => `/api/proxy/pembelian-sparepart/${id}/bukti`,
    PEMBELIAN_SPAREPART_BUKTI_DETAIL:    (id: string, idBukti: string) => `/api/proxy/pembelian-sparepart/${id}/bukti/${idBukti}`,

    // Shift
    SHIFT:        '/api/proxy/shift',
    SHIFT_DETAIL: (id: string) => `/api/proxy/shift/${id}`,

    // Jadwal Shift
    JADWAL_SHIFT:        '/api/proxy/jadwal-shift',
    JADWAL_SHIFT_OPSI_SUPIR_VENDOR: '/api/proxy/jadwal-shift/opsi-supir-vendor',
    JADWAL_SHIFT_DETAIL: (id: string) => `/api/proxy/jadwal-shift/${id}`,
    JADWAL_SHIFT_IMPORT:          '/api/proxy/jadwal-shift/import',
    JADWAL_SHIFT_IMPORT_TEMPLATE: '/api/proxy/jadwal-shift/import/template',

    // Karyawan Exit
    KARYAWAN_EXIT: '/api/proxy/karyawan-exit',

    // Izin Peran
    IZIN_PERAN:        '/api/proxy/izin-peran',
    IZIN_PERAN_BULK:   '/api/proxy/izin-peran/bulk',
    IZIN_PERAN_DETAIL: (id: string) => `/api/proxy/izin-peran/${id}`,

    // Supir
    SUPIR:        '/api/proxy/supir',
    SUPIR_ME:     '/api/proxy/supir/me',
    SUPIR_OPSI_PENGGUNA: '/api/proxy/supir/opsi-pengguna',
    SUPIR_DETAIL: (id: string) => `/api/proxy/supir/${id}`,

    // Import Supir
    SUPIR_IMPORT_TEMPLATE: '/api/proxy/supir/import/template',
    SUPIR_IMPORT:          '/api/proxy/supir/import',

    // Supir Proyek
    SUPIR_PROYEK:        '/api/proxy/supir-proyek',
    SUPIR_PROYEK_DETAIL: (id: string) => `/api/proxy/supir-proyek/${id}`,

    // Vendor
    VENDOR:        '/api/proxy/vendor',
    VENDOR_DETAIL: (id: string) => `/api/proxy/vendor/${id}`,
    VENDOR_IMPORT_TEMPLATE: '/api/proxy/vendor/import/template',
    VENDOR_IMPORT:          '/api/proxy/vendor/import',

    // Kontrak Vendor
    KONTRAK_VENDOR:        '/api/proxy/kontrak-vendor',
    KONTRAK_VENDOR_DETAIL: (id: string) => `/api/proxy/kontrak-vendor/${id}`,
    KONTRAK_VENDOR_TEMPLATE_PASANGAN: '/api/proxy/kontrak-vendor/template-pasangan',
    KONTRAK_VENDOR_EXPORT_PDF: (id: string) => `/api/proxy/kontrak-vendor/${id}/export/pdf`,
    KONTRAK_VENDOR_PARSE_PASANGAN: '/api/proxy/kontrak-vendor/parse-pasangan',
    KONTRAK_VENDOR_PARSE_UNIT:  '/api/proxy/kontrak-vendor/parse-unit',
    KONTRAK_VENDOR_PARSE_SUPIR: '/api/proxy/kontrak-vendor/parse-supir',
    KONTRAK_VENDOR_TIMPA_UNIT:  (id: string) => `/api/proxy/kontrak-vendor/${id}/timpa-unit`,
    KONTRAK_VENDOR_TIMPA_PASANGAN: (id: string) => `/api/proxy/kontrak-vendor/${id}/timpa-pasangan`,
    KONTRAK_VENDOR_AJUKAN_APPROVAL: (id: string) => `/api/proxy/kontrak-vendor/${id}/ajukan-approval`,
    KONTRAK_VENDOR_TIMPA_SUPIR: (id: string) => `/api/proxy/kontrak-vendor/${id}/timpa-supir`,

    // Trip
    TRIP:                 '/api/proxy/trip',
    TRIP_RINGKASAN_PROYEK: '/api/proxy/trip/ringkasan-proyek',
    TRIP_MULAI:    '/api/proxy/trip/mulai',
    TRIP_UANG_JALAN:       (id: string) => `/api/proxy/trip/${id}/uang-jalan`,
    TRIP_DETAIL:   (id: string) => `/api/proxy/trip/${id}`,
    TRIP_CHECKIN:  (id: string) => `/api/proxy/trip/${id}/checkin`,
    TRIP_CHECKOUT: (id: string) => `/api/proxy/trip/${id}/checkout`,
    TRIP_STATUS:   (id: string) => `/api/proxy/trip/${id}/status`,
    TRIP_TITIK_DROP: (id: string) => `/api/proxy/trip/${id}/titik-drop`,

    // Laporan Proyek
    LAPORAN:        '/api/proxy/laporan',
    LAPORAN_DETAIL: (id: string) => `/api/proxy/laporan/${id}`,

    // Faktur
    PENAGIHAN_TRIP:        '/api/proxy/penagihan-trip',
    PENAGIHAN_TRIP_FAKTUR: '/api/proxy/penagihan-trip/faktur',
    FAKTUR:        '/api/proxy/faktur',
    FAKTUR_DETAIL: (id: string) => `/api/proxy/faktur/${id}`,
    FAKTUR_STATUS: (id: string) => `/api/proxy/faktur/${id}/status`,
    FAKTUR_AJUKAN_APPROVAL: (id: string) => `/api/proxy/faktur/${id}/ajukan-approval`,


    // Invoice Vendor
    KONSOLIDASI_KLIEN:               '/api/proxy/konsolidasi-klien',
    KONSOLIDASI_KLIEN_EXPORT_EXCEL:  '/api/proxy/konsolidasi-klien/export/excel',
    KONSOLIDASI_VENDOR:              '/api/proxy/konsolidasi-vendor',
    KONSOLIDASI_VENDOR_EXPORT_EXCEL: '/api/proxy/konsolidasi-vendor/export/excel',
    INVOICE_VENDOR:            '/api/proxy/invoice-vendor',
    INVOICE_VENDOR_MONITORING: '/api/proxy/invoice-vendor/monitoring',
    INVOICE_VENDOR_TRIP_SIAP_TAGIH: '/api/proxy/invoice-vendor/trip-siap-tagih',
    INVOICE_VENDOR_DETAIL:     (id: string) => `/api/proxy/invoice-vendor/${id}`,
    INVOICE_VENDOR_AJUKAN_APPROVAL: (id: string) => `/api/proxy/invoice-vendor/${id}/ajukan-approval`,
    INVOICE_VENDOR_PEMBAYARAN: (idInvoice: string) => `/api/proxy/invoice-vendor/${idInvoice}/pembayaran`,
    INVOICE_VENDOR_PEMBAYARAN_AJUKAN: (idInvoice: string) => `/api/proxy/invoice-vendor/${idInvoice}/pembayaran/ajukan`,
    INVOICE_VENDOR_PEMBAYARAN_DELETE: (idInvoice: string, idPembayaran: string) => `/api/proxy/invoice-vendor/${idInvoice}/pembayaran/${idPembayaran}`,
    INVOICE_VENDOR_EXPORT_PDF: (id: string) => `/api/proxy/invoice-vendor/${id}/export/pdf`,
    INVOICE_VENDOR_PEMBAYARAN_EXPORT_PDF: (idInvoice: string, idPembayaran: string) => `/api/proxy/invoice-vendor/${idInvoice}/pembayaran/${idPembayaran}/export/pdf`,

    // Karyawan
    KARYAWAN:        '/api/proxy/karyawan',
    KARYAWAN_DETAIL: (id: string) => `/api/proxy/karyawan/${id}`,
    KARYAWAN_RIWAYAT_JABATAN: (id: string) => `/api/proxy/karyawan/${id}/riwayat-jabatan`,
    KARYAWAN_KONTRAK:        (idKaryawan: string) => `/api/proxy/karyawan/${idKaryawan}/kontrak`,
    KARYAWAN_KONTRAK_DETAIL: (idKaryawan: string, id: string) => `/api/proxy/karyawan/${idKaryawan}/kontrak/${id}`,
    DOKUMEN_KARYAWAN:        '/api/proxy/dokumen-karyawan',
    KARYAWAN_DOKUMEN:        (idKaryawan: string) => `/api/proxy/karyawan/${idKaryawan}/dokumen`,
    KARYAWAN_DOKUMEN_DETAIL: (idKaryawan: string, id: string) => `/api/proxy/karyawan/${idKaryawan}/dokumen/${id}`,

    // Cuti & Izin
    JENIS_CUTI:               '/api/proxy/jenis-cuti',
    JENIS_CUTI_DETAIL:        (id: string) => `/api/proxy/jenis-cuti/${id}`,
    PENGAJUAN_CUTI:           '/api/proxy/pengajuan-cuti',
    PENGAJUAN_CUTI_AKTIF:     '/api/proxy/pengajuan-cuti/aktif',
    PENGAJUAN_CUTI_SETUJUI:   (id: string) => `/api/proxy/pengajuan-cuti/${id}/setujui`,
    PENGAJUAN_CUTI_TOLAK:     (id: string) => `/api/proxy/pengajuan-cuti/${id}/tolak`,
    PENGAJUAN_CUTI_BATALKAN:  (id: string) => `/api/proxy/pengajuan-cuti/${id}/batalkan`,
    SALDO_CUTI:               '/api/proxy/saldo-cuti',
    SALDO_CUTI_REKAP:         '/api/proxy/saldo-cuti/rekap',
    SALDO_CUTI_PENYESUAIAN:   '/api/proxy/saldo-cuti/penyesuaian',

    // Absensi
    ABSENSI_HARIAN:     '/api/proxy/absensi/harian',
    ABSENSI_REKAP:      '/api/proxy/absensi/rekap',
    ABSENSI_PENGATURAN: '/api/proxy/absensi/pengaturan',

    // Payroll
    PAYROLL_PENGATURAN:        '/api/proxy/payroll/pengaturan',
    PAYROLL_PREVIEW_RENTANG:   '/api/proxy/payroll/preview-rentang',
    PAYROLL_PERIODE:           '/api/proxy/payroll/periode',
    PAYROLL_PERIODE_DETAIL:    (id: string) => `/api/proxy/payroll/periode/${id}`,
    PAYROLL_GENERATE:          (id: string) => `/api/proxy/payroll/periode/${id}/generate`,
    PAYROLL_IMPORT:            (id: string) => `/api/proxy/payroll/periode/${id}/import`,
    PAYROLL_IMPORT_TEMPLATE:   (id: string) => `/api/proxy/payroll/periode/${id}/import/template`,
    PAYROLL_PENGAJUAN:         (id: string) => `/api/proxy/payroll/periode/${id}/pengajuan`,
    PAYROLL_FINALISASI:        (id: string) => `/api/proxy/payroll/periode/${id}/finalisasi`,
    PAYROLL_BATAL_FINALISASI:  (id: string) => `/api/proxy/payroll/periode/${id}/batal-finalisasi`,
    PAYROLL_SLIP:              (id: string) => `/api/proxy/payroll/slip/${id}`,
    PAYROLL_SLIP_PDF:          (id: string) => `/api/proxy/payroll/slip/${id}/pdf`,

    // Penugasan
    PENUGASAN:        '/api/proxy/penugasan',
    PENUGASAN_DETAIL: (id: string) => `/api/proxy/penugasan/${id}`,
    PENUGASAN_OPSI_ARMADA_VENDOR: '/api/proxy/penugasan/opsi-armada-vendor',
    PENUGASAN_HARIAN: '/api/proxy/penugasan/harian',
    PENUGASAN_BOARD:  '/api/proxy/penugasan/board',
    PENUGASAN_BOARD_AKTIVITAS: '/api/proxy/penugasan/board/aktivitas',

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
    TIPE_PEMBAYARAN:            '/api/proxy/tipe-pembayaran',
    TIPE_PEMBAYARAN_OPSI_AKTIF: '/api/proxy/tipe-pembayaran/opsi-aktif',
    TIPE_PEMBAYARAN_DETAIL:     (id: string) => `/api/proxy/tipe-pembayaran/${id}`,

    // Lokasi Kantor
    LOKASI_KANTOR:        '/api/proxy/lokasi-kantor',
    LOKASI_KANTOR_DETAIL: (id: string) => `/api/proxy/lokasi-kantor/${id}`,

    // Departemen
    DEPARTEMEN:        '/api/proxy/departemen',
    DEPARTEMEN_DETAIL: (id: string) => `/api/proxy/departemen/${id}`,

    // Jabatan
    JABATAN:        '/api/proxy/jabatan',
    JABATAN_DETAIL: (id: string) => `/api/proxy/jabatan/${id}`,
    JABATAN_STRUKTUR_ORGANISASI: '/api/proxy/jabatan/struktur-organisasi',

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
    RUTE_ESTIMASI_BOK: '/api/proxy/rute/estimasi-bok',

    // Penawaran
    PENAWARAN:        '/api/proxy/penawaran',
    PENAWARAN_DETAIL: (id: string) => `/api/proxy/penawaran/${id}`,
    PENAWARAN_STATUS: (id: string) => `/api/proxy/penawaran/${id}/status`,
    PENAWARAN_AJUKAN_APPROVAL: (id: string) => `/api/proxy/penawaran/${id}/ajukan-approval`,

    // Notifikasi
    NOTIFIKASI:       '/api/proxy/notifikasi',
    NOTIFIKASI_BACA:  (id: string) => `/api/proxy/notifikasi/${id}/baca`,
    NOTIFIKASI_BACA_SEMUA: '/api/proxy/notifikasi/baca-semua',

    // Export
    FAKTUR_EXPORT_PDF:     (id: string) => `/api/proxy/faktur/${id}/export/pdf`,
    LAPORAN_EXPORT_EXCEL:  '/api/proxy/laporan/export/excel',
    LAPORAN_EXPORT_PDF:    '/api/proxy/laporan/export/pdf',

    // Trip lanjutan
    TRIP_REKAP_BIAYA:        (id: string) => `/api/proxy/trip/${id}/rekap-biaya`,
    TRIP_BATALKAN:           (id: string) => `/api/proxy/trip/${id}/batalkan`,
    TRIP_LAPORAN_PERJALANAN: (idTrip: string) => `/api/proxy/trip/${idTrip}/laporan-perjalanan`,
    TRIP_REKAP_SUPIR_EXPORT_EXCEL: '/api/proxy/trip/rekap-supir/export/excel',
    TRIP_REKAP_SUPIR_EXPORT_PDF:   '/api/proxy/trip/rekap-supir/export/pdf',
    TRIP_RIWAYAT_EXPORT_EXCEL:     '/api/proxy/trip/riwayat/export/excel',
    TRIP_RIWAYAT_EXPORT_PDF:       '/api/proxy/trip/riwayat/export/pdf',
    LAPORAN_PERJALANAN_DETAIL: (id: string) => `/api/proxy/laporan-perjalanan/${id}`,
    LAPORAN_PERJALANAN_FOTO:   (id: string) => `/api/proxy/laporan-perjalanan/${id}/foto`,
    LAPORAN_PERJALANAN_FOTO_DELETE: (id: string, idFoto: string) => `/api/proxy/laporan-perjalanan/${id}/foto/${idFoto}`,

    // Dokumen Vendor
    VENDOR_DOKUMEN:        (idVendor: string) => `/api/proxy/vendor/${idVendor}/dokumen`,
    VENDOR_DOKUMEN_UPDATE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/dokumen/${id}`,
    VENDOR_DOKUMEN_DELETE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/dokumen/${id}`,

    // Rekening Vendor
    VENDOR_REKENING:        (idVendor: string) => `/api/proxy/vendor/${idVendor}/rekening`,
    VENDOR_REKENING_UPDATE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/rekening/${id}`,
    VENDOR_REKENING_DELETE: (idVendor: string, id: string) => `/api/proxy/vendor/${idVendor}/rekening/${id}`,

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
    ARMADA_VENDOR_IMPORT_TEMPLATE: '/api/proxy/armada-vendor/import/template',
    ARMADA_VENDOR_IMPORT:          '/api/proxy/armada-vendor/import',

    // Supir Vendor
    SUPIR_VENDOR:        '/api/proxy/supir-vendor',
    SUPIR_VENDOR_DETAIL: (id: string) => `/api/proxy/supir-vendor/${id}`,
    SUPIR_VENDOR_IMPORT_TEMPLATE: '/api/proxy/supir-vendor/import/template',
    SUPIR_VENDOR_IMPORT:          '/api/proxy/supir-vendor/import',

    // Lokasi
    LOKASI:        '/api/proxy/lokasi',
    LOKASI_DETAIL: (id: string) => `/api/proxy/lokasi/${id}`,

    // Jenis BBM
    JENIS_BBM:        '/api/proxy/jenis-bbm',
    JENIS_BBM_DETAIL: (id: string) => `/api/proxy/jenis-bbm/${id}`,
    JENIS_BBM_HARGA:  (id: string) => `/api/proxy/jenis-bbm/${id}/harga`,

    // Parameter BOK
    PARAMETER_BOK:        '/api/proxy/parameter-bok',
    PARAMETER_BOK_DETAIL: (id: string) => `/api/proxy/parameter-bok/${id}`,

    // Evaluasi Vendor
    PENUGASAN_EVALUASI:    (idPenugasan: string) => `/api/proxy/penugasan/${idPenugasan}/evaluasi`,
    EVALUASI_DETAIL:       (id: string) => `/api/proxy/evaluasi/${id}`,
    EVALUASI_VENDOR_REKAP: '/api/proxy/evaluasi-vendor/rekap',
    EVALUASI_VENDOR_PENUGASAN: '/api/proxy/evaluasi-vendor/penugasan',
    VENDOR_EVALUASI:       (idVendor: string) => `/api/proxy/vendor/${idVendor}/evaluasi`,

    // Arus Kas
    ARUS_KAS:                  '/api/proxy/arus-kas',
    ARUS_KAS_EXPORT_EXCEL:     '/api/proxy/arus-kas/export/excel',
    ARUS_KAS_PENGAJUAN:        '/api/proxy/arus-kas/pengajuan',
    ARUS_KAS_PENGAJUAN_DETAIL: (id: string) => `/api/proxy/arus-kas/pengajuan/${id}`,
    ARUS_KAS_PENGAJUAN_CEK:      (id: string) => `/api/proxy/arus-kas/pengajuan/${id}/cek`,
    ARUS_KAS_PENGAJUAN_TOLAK:    (id: string) => `/api/proxy/arus-kas/pengajuan/${id}/tolak`,
    ARUS_KAS_PENGAJUAN_TRANSFER: (id: string) => `/api/proxy/arus-kas/pengajuan/${id}/transfer`,
    ARUS_KAS_PENGAJUAN_APPROVAL: (id: string) => `/api/proxy/arus-kas/pengajuan/${id}/approval`,
    ARUS_KAS_PENGAJUAN_MENUNGGU_SAYA: '/api/proxy/arus-kas/pengajuan/menunggu-approval-saya',
    ARUS_KAS_PENGAJUAN_RIWAYAT:  (id: string) => `/api/proxy/arus-kas/pengajuan/${id}/riwayat`,

    // Pemasukan
    ARUS_KAS_PEMASUKAN:        '/api/proxy/arus-kas/pemasukan',
    ARUS_KAS_PEMASUKAN_DETAIL: (id: string) => `/api/proxy/arus-kas/pemasukan/${id}`,

    // Approval Keuangan
    // APPROVER_KEUANGAN masih dipakai approvalKeuangan.service.ts lama — jangan dihapus
    // sebelum migrasi ke Approval Generik (konfigurasi-approval) ikut ter-commit.
    APPROVER_KEUANGAN:        '/api/proxy/arus-kas/approver',
    APPROVER_KEUANGAN_DETAIL: (id: string) => `/api/proxy/arus-kas/approver/${id}`,
    PENGATURAN_APPROVAL:      '/api/proxy/arus-kas/pengaturan-approval',

    // Approval Generik
    APPROVAL_EVENT_TYPE:               '/api/proxy/approval-event-type',
    APPROVAL_EVENT_TYPE_DETAIL:        (id: string) => `/api/proxy/approval-event-type/${id}`,
    APPROVAL_EVENT_TYPE_APPROVER:      (idEventType: string) => `/api/proxy/approval-event-type/${idEventType}/approver`,
    APPROVAL_EVENT_TYPE_APPROVER_DETAIL: (idEventType: string, idConfig: string) => `/api/proxy/approval-event-type/${idEventType}/approver/${idConfig}`,
    APPROVAL_MENUNGGU_SAYA: '/api/proxy/approval-pengajuan/menunggu-saya',
    APPROVAL_KEPUTUSAN:     (idApproval: string) => `/api/proxy/approval-pengajuan/${idApproval}/keputusan`,
    APPROVAL_RIWAYAT_SAYA:  '/api/proxy/approval-pengajuan/riwayat-saya',
    APPROVAL_EXPORT_SAYA:   '/api/proxy/approval-pengajuan/export-saya',
    APPROVAL_STATUS_REFERENSI: '/api/proxy/approval-pengajuan/status-referensi',

    // Pengaturan Kode
    PENGATURAN_KODE:        '/api/proxy/pengaturan-kode',
    PENGATURAN_KODE_UPDATE: (entitas: string) => `/api/proxy/pengaturan-kode/${entitas}`,
} as const
