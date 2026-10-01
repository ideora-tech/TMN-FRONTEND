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
    nama_vendor: string | null
    nopol: string
    rute: string
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
    uang_jalan_per_trip: number
    jumlah_trip: number
    nomor_rekening: string
    nama_bank: string
    catatan: string | null
}

export type UangJalanFilter = {
    search?: string
    status?: string
}

export interface OpsiSupir {
    id_supir: string
    nama: string
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

export const uangJalanService = {
    async list(page = 1, limit = 10, filter: UangJalanFilter = {}) {
        const { data } = await axios.get(API_ENDPOINTS.UANG_JALAN, {
            params: {
                page,
                limit,
                search: filter.search || undefined,
                status: filter.status || undefined,
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
}
