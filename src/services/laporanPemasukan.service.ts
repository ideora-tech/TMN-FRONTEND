import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { unduhDariApi } from '@/utils/unduhBerkas'

export interface BarisPemasukan {
    tanggal: string
    nomor: string
    kategori: string
    label_kategori: string
    pihak: string | null
    keterangan: string | null
    no_referensi: string | null
    nominal: number
    potongan: number
    keterangan_potongan: string | null
    oleh: string | null
    url_bukti: string | null
    label_dokumen: string
    link_dokumen: string
}

export interface RekapKategoriPemasukan {
    kategori: string
    label: string
    jumlah: number
    total: number
    potongan: number
}

export interface LaporanPemasukan {
    periode: { dari: string; sampai: string }
    ringkasan: {
        total_pemasukan: number
        dari_invoice: number
        pemasukan_lain: number
        potongan_klien: number
        jumlah_transaksi: number
        invoice_terbit: { jumlah: number; total: number }
    }
    per_kategori: RekapKategoriPemasukan[]
    rincian: { jumlah: number; total: number; potongan: number }
    data: BarisPemasukan[]
    meta: { page: number; limit: number; total: number; totalPages: number }
    opsi_kategori: { value: string; label: string }[]
}

export type FilterLaporanPemasukan = {
    dari?: string
    sampai?: string
    kategori?: string
    search?: string
}

const paramFilter = (filter: FilterLaporanPemasukan) => ({
    dari: filter.dari || undefined,
    sampai: filter.sampai || undefined,
    kategori: filter.kategori || undefined,
    search: filter.search || undefined,
})

export const laporanPemasukanService = {
    async laporan(page = 1, limit = 10, filter: FilterLaporanPemasukan = {}) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN_PEMASUKAN, { params: { page, limit, ...paramFilter(filter) } })
        return data.data as LaporanPemasukan
    },

    async exportExcel(filter: FilterLaporanPemasukan = {}) {
        await unduhDariApi(
            API_ENDPOINTS.LAPORAN_PEMASUKAN_EXPORT,
            paramFilter(filter),
            `laporan-pemasukan-${dayjs().format('YYYY-MM-DD')}.xlsx`,
        )
    },
}
