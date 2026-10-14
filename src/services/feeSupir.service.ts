import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { unduhDariApi } from '@/utils/unduhBerkas'

export interface RingkasanFeeSupir {
    dari: string
    sampai: string
    total: number
    jumlah_trip: number
    jumlah_supir: number
}

export interface RekapFeeSupir {
    id_supir: string
    nama_supir: string | null
    telepon: string | null
    jumlah_trip: number
    total: number
    tanggal_terakhir: string | null
}

export interface RincianFeeSupir {
    id_fee_supir_trip: string
    id_trip: string
    id_supir: string
    nama_supir: string | null
    tanggal: string
    waktu_selesai: string | null
    kode_proyek: string | null
    nama_proyek: string | null
    nama_rute: string | null
    asal: string | null
    tujuan: string | null
    nopol: string | null
    nominal: number
}

export interface UrutanTripSupir {
    on_call: boolean
    trip_ke: number | null
}

export type ParamUrutanTrip = {
    id_proyek: string
    id_supir: string
    tanggal: string
    id_penugasan?: string | null
}

export interface HalamanFeeSupir<T> {
    data: T[]
    meta: { page: number; limit: number; total: number; totalPages: number }
}

export type FilterFeeSupir = {
    dari?: string
    sampai?: string
    search?: string
    id_supir?: string
}

const paramFilter = (filter: FilterFeeSupir) => ({
    dari: filter.dari || undefined,
    sampai: filter.sampai || undefined,
    search: filter.search || undefined,
    id_supir: filter.id_supir || undefined,
})

export const feeSupirService = {
    async urutanTrip(param: ParamUrutanTrip) {
        const { data } = await axios.get(API_ENDPOINTS.FEE_SUPIR_URUTAN_TRIP, {
            params: { ...param, id_penugasan: param.id_penugasan || undefined },
        })
        return data.data as UrutanTripSupir
    },

    async ringkasan(filter: FilterFeeSupir = {}) {
        const { data } = await axios.get(API_ENDPOINTS.FEE_SUPIR_RINGKASAN, { params: paramFilter(filter) })
        return data.data as RingkasanFeeSupir
    },

    async rekap(page = 1, limit = 10, filter: FilterFeeSupir = {}) {
        const { data } = await axios.get(API_ENDPOINTS.FEE_SUPIR_REKAP, { params: { page, limit, ...paramFilter(filter) } })
        return data as HalamanFeeSupir<RekapFeeSupir>
    },

    async rincian(page = 1, limit = 10, filter: FilterFeeSupir = {}) {
        const { data } = await axios.get(API_ENDPOINTS.FEE_SUPIR, { params: { page, limit, ...paramFilter(filter) } })
        return data as HalamanFeeSupir<RincianFeeSupir>
    },

    async exportExcel(filter: FilterFeeSupir = {}) {
        await unduhDariApi(
            API_ENDPOINTS.FEE_SUPIR_EXPORT_EXCEL,
            paramFilter(filter),
            `fee-supir-${(filter.dari ?? '').replace(/-/g, '')}-${(filter.sampai ?? '').replace(/-/g, '')}.xlsx`,
        )
    },
}
