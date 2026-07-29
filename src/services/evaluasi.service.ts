import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface EvaluasiTrip {
    id_evaluasi: string
    id_penugasan: string
    nilai_armada: number | null
    nilai_supir: number | null
    nilai_ketepatan_waktu: number | null
    nilai_kualitas: number | null
    nilai_harga: number | null
    nilai_responsif: number | null
    catatan: string | null
}

export interface RekapEvaluasiVendor {
    id_vendor: string
    nama_vendor: string
    jumlah_evaluasi: number
    rata_ketepatan_waktu: number | null
    rata_kualitas: number | null
    rata_harga: number | null
    rata_responsif: number | null
    rata_keseluruhan: number | null
}

export interface EvaluasiVendorItem {
    id_evaluasi: string
    id_penugasan: string
    tanggal_tugas: string | null
    nama_proyek: string | null
    nilai_ketepatan_waktu: number | null
    nilai_kualitas: number | null
    nilai_harga: number | null
    nilai_responsif: number | null
    nilai_armada: number | null
    nilai_supir: number | null
    catatan: string | null
    dibuat_pada: string
}

export type EvaluasiPayload = {
    nilai_armada?: number | null
    nilai_supir?: number | null
    nilai_ketepatan_waktu?: number | null
    nilai_kualitas?: number | null
    nilai_harga?: number | null
    nilai_responsif?: number | null
    catatan?: string | null
}

export const evaluasiService = {
    async getByPenugasan(idPenugasan: string) {
        try {
            const { data } = await axios.get(API_ENDPOINTS.PENUGASAN_EVALUASI(idPenugasan))
            return data.data as EvaluasiTrip
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) return null
            throw err
        }
    },

    async create(idPenugasan: string, payload: EvaluasiPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PENUGASAN_EVALUASI(idPenugasan), payload)
        return data.data as EvaluasiTrip
    },

    async update(idEvaluasi: string, payload: EvaluasiPayload) {
        const { data } = await axios.put(API_ENDPOINTS.EVALUASI_DETAIL(idEvaluasi), payload)
        return data.data as EvaluasiTrip
    },

    async rekapVendor() {
        const { data } = await axios.get(API_ENDPOINTS.EVALUASI_VENDOR_REKAP)
        return data.data as RekapEvaluasiVendor[]
    },

    async listByVendor(idVendor: string) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR_EVALUASI(idVendor))
        return data.data as EvaluasiVendorItem[]
    },
}
