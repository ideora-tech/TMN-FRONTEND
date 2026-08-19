import { KategoriPengajuan, StatusPengajuan, StatusApproval } from '@/services/arusKas.service'

export const KATEGORI_LABEL: Record<KategoriPengajuan, string> = {
    uang_jalan: 'Uang Jalan',
    legalitas:  'Legalitas',
    perawatan:  'Perawatan',
    sparepart:  'Sparepart',
    penggajian: 'Penggajian',
    pembelian_aset:      'Pembelian Aset',
    pembayaran_pinjaman: 'Pembayaran Pinjaman',
    lainnya:    'Lainnya',
}

/** Kategori yang boleh dipilih manual saat membuat pengajuan baru — sparepart & penggajian
 *  hanya pernah dibuat otomatis oleh modul lain (Pembelian Sparepart, Payroll). */
export const KATEGORI_OPTIONS_FORM: { value: KategoriPengajuan; label: string }[] = [
    { value: 'uang_jalan', label: 'Uang Jalan' },
    { value: 'legalitas',  label: 'Legalitas' },
    { value: 'perawatan',  label: 'Perawatan' },
    { value: 'pembelian_aset',      label: 'Pembelian Aset' },
    { value: 'pembayaran_pinjaman', label: 'Pembayaran Pinjaman' },
    { value: 'lainnya',    label: 'Lainnya' },
]

/** Semua kategori, untuk dropdown filter laporan/approval (termasuk yang otomatis). */
export const KATEGORI_OPTIONS_FILTER: { value: KategoriPengajuan; label: string }[] =
    Object.entries(KATEGORI_LABEL).map(([value, label]) => ({ value: value as KategoriPengajuan, label }))

export const PENERIMA_LABEL: Partial<Record<KategoriPengajuan, string>> = {
    uang_jalan: 'Supir',
    sparepart:  'Supplier',
    perawatan:  'Armada',
}

export const STATUS_LABEL: Record<StatusPengajuan, string> = {
    diajukan:          'Diajukan',
    dicek:             'Dicek',
    menunggu_approval: 'Menunggu Approval',
    disetujui:         'Disetujui',
    ditolak:           'Ditolak',
    ditransfer:        'Ditransfer',
}

export const STATUS_TAG: Record<StatusPengajuan, string> = {
    diajukan:          'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    dicek:             'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:         'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    ditransfer:        'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export const STATUS_APPROVAL_LABEL: Record<StatusApproval, string> = {
    menunggu:  'Menunggu',
    disetujui: 'Disetujui',
    ditolak:   'Ditolak',
}

export const STATUS_APPROVAL_TAG: Record<StatusApproval, string> = {
    menunggu:  'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    ditolak:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}
