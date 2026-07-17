import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface JenisBbm {
    id_jenis_bbm: string
    id_perusahaan: string
    nama_bbm: string
    aktif: boolean
    harga_per_liter: number | null
    dibuat_pada: string
}

export interface HargaBbm {
    id_harga_bbm: string
    harga_per_liter: number
    berlaku_mulai: string
    dibuat_pada: string
}

export type HargaBbmPayload = {
    harga_per_liter: number
    berlaku_mulai: string
}

export const jenisBbmService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_BBM, { params: { page, limit } })
        return data as { data: JenisBbm[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_BBM_DETAIL(id))
        return data.data as JenisBbm
    },
    async create(payload: { nama_bbm: string; aktif: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.JENIS_BBM, payload)
        return data.data as JenisBbm
    },
    async update(id: string, payload: Partial<{ nama_bbm: string; aktif: boolean }>) {
        const { data } = await axios.put(API_ENDPOINTS.JENIS_BBM_DETAIL(id), payload)
        return data.data as JenisBbm
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JENIS_BBM_DETAIL(id))
    },
    async listHarga(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_BBM_HARGA(id))
        return data.data as HargaBbm[]
    },
    async createHarga(id: string, payload: HargaBbmPayload) {
        const { data } = await axios.post(API_ENDPOINTS.JENIS_BBM_HARGA(id), payload)
        return data.data as HargaBbm
    },
}
