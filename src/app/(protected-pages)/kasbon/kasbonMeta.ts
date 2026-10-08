import dayjs from 'dayjs'
import type { StatusKasbon } from '@/services/kasbon.service'

export const STATUS_KASBON_LABEL: Record<StatusKasbon, string> = {
    menunggu_approval:  'Menunggu Approval',
    menunggu_pencairan: 'Menunggu Pencairan',
    ditolak:            'Ditolak',
    berjalan:           'Berjalan',
    lunas:              'Lunas',
}

export const STATUS_KASBON_TAG: Record<StatusKasbon, string> = {
    menunggu_approval:  'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    menunggu_pencairan: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:            'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    berjalan:           'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    lunas:              'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export const TAG_KASBON_LAMA = 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'

export type OpsiTeks = { value: string; label: string }

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const BULAN_OPTIONS: OpsiTeks[] = NAMA_BULAN.map((nama, i) => ({ value: String(i + 1).padStart(2, '0'), label: nama }))

export const opsiTahun = (tahunTerpilih?: string): OpsiTeks[] => {
    const sekarang = Number(dayjs().format('YYYY'))
    const daftar = [sekarang - 1, sekarang, sekarang + 1, sekarang + 2]
    const terpilih = Number(tahunTerpilih)
    if (terpilih && !daftar.includes(terpilih)) daftar.push(terpilih)
    return daftar.sort((a, b) => a - b).map(t => ({ value: String(t), label: String(t) }))
}

export const labelBulan = (bulan: string | null | undefined): string => {
    if (!bulan) return '—'
    const nama = NAMA_BULAN[Number(bulan.slice(5, 7)) - 1]
    return nama ? `${nama} ${bulan.slice(0, 4)}` : bulan
}

export const sudahDicairkan = (status: StatusKasbon): boolean => status === 'berjalan' || status === 'lunas'

export const angkaRupiah = (nilai: string): string => nilai.replace(/,\d{1,2}$/, '').replace(/\D/g, '').slice(0, 10)
