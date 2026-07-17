import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface JenisPerawatan {
    id_jenis_perawatan: string
    id_perusahaan: string
    nama: string
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type JenisPerawatanPayload = {
    nama: string
    keterangan?: string | null
    aktif?: boolean
}

export const jenisPerawatanService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_PERAWATAN, { params: { page, limit } })
        return data as { data: JenisPerawatan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_PERAWATAN_DETAIL(id))
        return data.data as JenisPerawatan
    },
    async create(payload: JenisPerawatanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.JENIS_PERAWATAN, payload)
        return data.data as JenisPerawatan
    },
    async update(id: string, payload: Partial<JenisPerawatanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.JENIS_PERAWATAN_DETAIL(id), payload)
        return data.data as JenisPerawatan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JENIS_PERAWATAN_DETAIL(id))
    },
}
