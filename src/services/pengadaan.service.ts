import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { StatusPermintaan, TipePermintaan } from './permintaanPembelian.service'
import type { PermintaanVendorMekanisme, PermintaanVendorStatus } from './permintaan-vendor.service'

export interface AntrianPR {
    id_permintaan: string
    nomor_permintaan: string
    judul: string
    status: StatusPermintaan
    tipe: TipePermintaan
    tanggal_permintaan: string
    username_pengaju: string | null
    total_estimasi: number
}

export interface AntrianPV {
    id_permintaan: string
    nomor_permintaan: string
    nama_proyek: string | null
    status: PermintaanVendorStatus
    mekanisme: PermintaanVendorMekanisme
    jumlah_unit: number
    periode_dari: string | null
    periode_sampai: string | null
    dibuat_pada: string | null
}

export interface RingkasanPengadaan {
    pr: {
        ringkasan: Partial<Record<StatusPermintaan, number>>
        menunggu: AntrianPR[]
    }
    permintaan_vendor: {
        ringkasan: Partial<Record<PermintaanVendorStatus, number>>
        menunggu: AntrianPV[]
    }
}

export const pengadaanService = {
    async ringkasan() {
        const { data } = await axios.get(API_ENDPOINTS.PENGADAAN_RINGKASAN)
        return data.data as RingkasanPengadaan
    },
}
