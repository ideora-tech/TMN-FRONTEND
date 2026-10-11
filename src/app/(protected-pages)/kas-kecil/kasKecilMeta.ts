import axios from 'axios'
import type { JenisTransaksiKasKecil, StatusPengisianKasKecil } from '@/services/kasKecil.service'

export type OpsiTeks = { value: string; label: string }

export const TAB_KAS_KECIL = ['buku', 'pengisian'] as const
export type TabKasKecil = (typeof TAB_KAS_KECIL)[number]

export const STATUS_PENGISIAN_LABEL: Record<StatusPengisianKasKecil, string> = {
    menunggu_approval: 'Menunggu Approval',
    menunggu_transfer: 'Menunggu Transfer',
    ditolak:           'Ditolak',
    selesai:           'Diterima Kas Kecil',
}

export const STATUS_PENGISIAN_TAG: Record<StatusPengisianKasKecil, string> = {
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    menunggu_transfer: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    selesai:           'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export const JENIS_TRANSAKSI_TAG: Record<JenisTransaksiKasKecil, string> = {
    pengisian:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    saldo_awal:  'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    pengeluaran: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
}

export const MAKS_NOMINAL = 1_000_000_000
export const MAKS_BERKAS = 5 * 1024 * 1024

export const errorPerField = (err: unknown): Record<string, string> => {
    if (!axios.isAxiosError(err)) return {}
    const errors = (err.response?.data as { errors?: Record<string, string[] | string> } | undefined)?.errors
    if (!errors || typeof errors !== 'object') return {}

    return Object.fromEntries(
        Object.entries(errors).map(([field, pesan]) => [field, Array.isArray(pesan) ? String(pesan[0] ?? '') : String(pesan)]),
    )
}
