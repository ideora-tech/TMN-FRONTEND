import { KategoriPemasukan } from '@/services/arusKas.service'

export const KATEGORI_PEMASUKAN_META: Record<KategoriPemasukan, { label: string; tag: string }> = {
    pendapatan_jasa: {
        label: 'Pendapatan Jasa',
        tag: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    penjualan_aset: {
        label: 'Penjualan Aset',
        tag: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
    },
    pengembalian_dana: {
        label: 'Pengembalian Dana',
        tag: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
    },
    modal_pinjaman: {
        label: 'Modal/Pinjaman',
        tag: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
    },
    lainnya: {
        label: 'Lainnya',
        tag: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    },
}

export const INVOICE_TAG = 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'

export const PEMASUKAN_MANUAL_TAG = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
