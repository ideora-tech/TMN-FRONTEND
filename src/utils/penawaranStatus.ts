import type { PenawaranStatus } from '@/services/penawaran.service'

export const PENAWARAN_STATUS_LABEL: Record<PenawaranStatus, string> = {
    draft: 'Draft / Quotation',
    menunggu_approval: 'Draft / Quotation',
    terkirim: 'Approve',
    negosiasi: 'Negosiasi',
    disetujui: 'Deal',
    ditolak: 'Batal',
}

export const PENAWARAN_STATUS_CLASS: Record<PenawaranStatus, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    menunggu_approval: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    negosiasi: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

export const PENAWARAN_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Semua Status' },
    { value: 'draft,menunggu_approval', label: 'Draft / Quotation' },
    { value: 'terkirim', label: 'Approve' },
    { value: 'negosiasi', label: 'Negosiasi' },
    { value: 'disetujui', label: 'Deal' },
    { value: 'ditolak', label: 'Batal' },
]
