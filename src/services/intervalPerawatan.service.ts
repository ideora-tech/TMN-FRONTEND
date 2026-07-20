import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface IntervalPerawatan {
    id_interval_perawatan: string
    id_perusahaan: string
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    nama_jenis_perawatan: string | null
    nama_jenis_kendaraan: string | null
    interval_hari: number
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type IntervalPerawatanPayload = {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    interval_hari: number
    aktif?: boolean
}

export const intervalPerawatanService = {
    async list(params?: { page?: number; limit?: number; id_jenis_perawatan?: string; id_jenis_kendaraan?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.INTERVAL_PERAWATAN, { params })
        return data as { data: IntervalPerawatan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.INTERVAL_PERAWATAN_DETAIL(id))
        return data.data as IntervalPerawatan
    },
    async create(payload: IntervalPerawatanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.INTERVAL_PERAWATAN, payload)
        return data.data as IntervalPerawatan
    },
    async update(id: string, payload: Partial<IntervalPerawatanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.INTERVAL_PERAWATAN_DETAIL(id), payload)
        return data.data as IntervalPerawatan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.INTERVAL_PERAWATAN_DETAIL(id))
    },
    async resolusi(params: { id_jenis_perawatan: string; id_jenis_kendaraan: string }): Promise<{ interval_hari: number } | null> {
        const { data } = await axios.get(API_ENDPOINTS.INTERVAL_PERAWATAN_RESOLUSI, { params })
        return data?.data ?? null
    },
}
