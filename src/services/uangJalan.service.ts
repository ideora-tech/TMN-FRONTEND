import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PengajuanKeuanganInfo, StatusPengajuan } from './arusKas.service'

export type TipeDriver = 'internal' | 'vendor'

export interface UangJalan {
    id_uang_jalan: string
    nomor_uang_jalan: string
    tanggal: string
    nama_driver: string
    tipe_driver: TipeDriver
    id_supir: string | null
    id_supir_vendor: string | null
    id_armada: string | null
    id_armada_vendor: string | null
    id_vendor: string | null
    id_rute: string | null
    id_proyek: string | null
    kode_proyek: string | null
    nama_proyek: string | null
    id_penugasan: string | null
    nama_vendor: string | null
    nopol: string
    rute: string
    tol_per_trip: number
    bbm_per_trip: number
    biaya_lain_per_trip: number
    uang_jalan_per_trip: number
    jumlah_trip: number
    nominal: number
    catatan: string | null
    nomor_rekening: string
    nama_bank: string
    id_pengajuan: string | null
    nomor_pengajuan: string | null
    status_pengajuan: StatusPengajuan | null
    alasan_ditolak: string | null
    tanggal_transfer: string | null
    bisa_diubah: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type UangJalanPayload = {
    tanggal: string
    tipe_driver: TipeDriver
    id_supir: string | null
    id_armada: string | null
    id_vendor: string | null
    id_supir_vendor: string | null
    id_armada_vendor: string | null
    id_rute: string
    id_proyek: string | null
    id_penugasan: string | null
    tol_per_trip: number
    bbm_per_trip: number
    biaya_lain_per_trip: number
    jumlah_trip: number
    nomor_rekening: string
    nama_bank: string
    catatan: string | null
}

export type UangJalanFilter = {
    search?: string
    status?: string
    id_proyek?: string
}

export interface OpsiSupir {
    id_supir: string
    nama: string
    id_armada_default?: string | null
    nama_bank: string | null
    nomor_rekening: string | null
}

export interface OpsiArmada {
    id_armada: string
    nopol: string
    merk: string | null
}

export interface OpsiVendor {
    id_vendor: string
    nama_vendor: string
}

export interface OpsiRute {
    id_rute: string
    nama_rute: string
}

export interface OpsiUangJalan {
    supir: OpsiSupir[]
    armada: OpsiArmada[]
    vendor: OpsiVendor[]
    rute: OpsiRute[]
}

export interface OpsiSupirVendor {
    id_supir_vendor: string
    nama: string
}

export interface OpsiArmadaVendor {
    id_armada_vendor: string
    nopol: string
    merk: string | null
    id_supir_vendor_default?: string | null
}

export interface OpsiRekeningVendor {
    nama_bank: string
    nomor_rekening: string
    atas_nama: string
}

export interface OpsiUangJalanVendor {
    supir_vendor: OpsiSupirVendor[]
    armada_vendor: OpsiArmadaVendor[]
    rekening: OpsiRekeningVendor[]
}

export interface OpsiProyek {
    id_proyek: string
    kode_proyek: string
    nama_proyek: string
}

export type SumberPenugasan = 'internal' | 'vendor'

export interface OpsiPenugasan {
    id_penugasan: string
    tanggal_tugas: string | null
    status: string
    sumber: SumberPenugasan
    id_supir: string | null
    id_supir_vendor: string | null
    id_armada: string | null
    id_armada_vendor: string | null
    id_rute: string | null
    id_vendor: string | null
    nama_driver: string | null
    nopol: string | null
    nama_rute: string | null
}

export interface RateCardRincian {
    tol_per_trip: number
    bbm_per_trip: number
    biaya_lain_per_trip: number
    uang_jalan_per_trip: number
}

export const uangJalanService = {
    async list(page = 1, limit = 10, filter: UangJalanFilter = {}) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN, {
            params: {
                page,
                limit,
                search: filter.search || undefined,
                status: filter.status || undefined,
                id_proyek: filter.id_proyek || undefined,
            },
        })
        return data as { data: UangJalan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_DETAIL(id))
        return data.data as UangJalan
    },

    async create(payload: UangJalanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.UANG_JALAN, payload)
        return data.data as UangJalan
    },

    async update(id: string, payload: UangJalanPayload) {
        const { data } = await axios.put(API_ENDPOINTS.UANG_JALAN_DETAIL(id), payload)
        return data.data as UangJalan
    },

    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.UANG_JALAN_DETAIL(id))
    },

    async riwayat(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_RIWAYAT(id))
        return data.data as PengajuanKeuanganInfo
    },

    async opsi() {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_OPSI)
        return data.data as OpsiUangJalan
    },

    async opsiVendor(idVendor: string) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_OPSI_VENDOR(idVendor))
        return data.data as OpsiUangJalanVendor
    },

    async tarifRateCard(params: { id_proyek: string; id_rute: string; id_armada?: string; id_armada_vendor?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_TARIF_RATE_CARD, { params })
        return data.data as RateCardRincian | null
    },

    async opsiProyek() {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_OPSI_PROYEK)
        return data.data as OpsiProyek[]
    },

    async opsiRuteProyek(idProyek: string) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_OPSI_RUTE_PROYEK(idProyek))
        return data.data as OpsiRute[]
    },

    async opsiPenugasan(idProyek: string) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN_OPSI_PENUGASAN(idProyek))
        return data.data as OpsiPenugasan[]
    },
}
