import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { unduhDariApi } from '@/utils/unduhBerkas'

export type SumberDanaPengeluaran = 'rekening' | 'kas_kecil'

export interface BarisPengeluaran {
    tanggal: string
    nomor: string
    kategori: string
    sub_kategori: string | null
    label_kategori: string
    sumber_dana: SumberDanaPengeluaran
    label_sumber_dana: string
    penerima: string | null
    keterangan: string | null
    nominal: number
    mutasi: boolean
    oleh: string | null
    url_bukti: string | null
    label_dokumen: string
    link_dokumen: string
}

export interface RekapKategoriPengeluaran {
    kategori: string
    sub_kategori: string | null
    label: string
    nilai_filter: string
    sumber_dana: SumberDanaPengeluaran
    label_sumber_dana: string
    jumlah: number
    total: number
    mutasi: boolean
}

export interface LaporanPengeluaran {
    periode: { dari: string; sampai: string }
    ringkasan: {
        total_pengeluaran: number
        dari_rekening: number
        dari_kas_kecil: number
        mutasi_kas_kecil: number
        jumlah_transaksi: number
    }
    per_kategori: RekapKategoriPengeluaran[]
    rincian: { jumlah: number; total: number; mutasi: number }
    data: BarisPengeluaran[]
    meta: { page: number; limit: number; total: number; totalPages: number }
    opsi_kategori: { value: string; label: string }[]
}

export type FilterLaporanPengeluaran = {
    dari?: string
    sampai?: string
    kategori?: string
    sumber_dana?: string
    search?: string
}

const paramFilter = (filter: FilterLaporanPengeluaran) => ({
    dari: filter.dari || undefined,
    sampai: filter.sampai || undefined,
    kategori: filter.kategori || undefined,
    sumber_dana: filter.sumber_dana || undefined,
    search: filter.search || undefined,
})

export const laporanPengeluaranService = {
    async laporan(page = 1, limit = 10, filter: FilterLaporanPengeluaran = {}) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN_PENGELUARAN, { params: { page, limit, ...paramFilter(filter) } })
        return data.data as LaporanPengeluaran
    },

    async exportExcel(filter: FilterLaporanPengeluaran = {}) {
        await unduhDariApi(
            API_ENDPOINTS.LAPORAN_PENGELUARAN_EXPORT,
            paramFilter(filter),
            `laporan-pengeluaran-${dayjs().format('YYYY-MM-DD')}.xlsx`,
        )
    },
}
