import type { PermintaanVendorStatus, PermintaanVendorMekanisme } from '@/services/permintaan-vendor.service'

export const STATUS_LABEL: Record<PermintaanVendorStatus, string> = {
    draft:             'Draft',
    menunggu_approval: 'Menunggu Approval',
    disetujui:         'Disetujui',
    diproses:          'Diproses',
    dikontrakkan:      'Dikontrakkan',
    selesai:           'Selesai',
    ditolak:           'Ditolak',
    dibatalkan:        'Dibatalkan',
}

export const STATUS_TAG: Record<PermintaanVendorStatus, string> = {
    draft:             'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:         'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    diproses:          'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
    dikontrakkan:      'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    selesai:           'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300',
    dibatalkan:        'bg-gray-200 text-gray-600 dark:bg-gray-600/30 dark:text-gray-300',
}

export const STATUS_URUT: PermintaanVendorStatus[] = ['draft', 'menunggu_approval', 'disetujui', 'diproses', 'dikontrakkan', 'selesai', 'ditolak', 'dibatalkan']

export const MEKANISME_LABEL: Record<PermintaanVendorMekanisme, string> = {
    unit_only:   'Unit Only',
    unit_driver: 'Unit + Driver',
    full:        'All In',
}
