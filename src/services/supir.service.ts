import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Supir {
    id_supir: string
    nama: string
    no_sim: string
    jenis_sim: string
    tgl_kadaluarsa_sim?: string
    telepon?: string
    status: 'aktif' | 'nonaktif'
    id_armada_default?: string | null
}

export const supirService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR, { params: { page, limit } })
        return data as { data: Supir[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_DETAIL(id))
        return data.data as Supir
    },
    async create(payload: Omit<Supir, 'id_supir' | 'status'>) {
        const { data } = await axios.post(API_ENDPOINTS.SUPIR, payload)
        return data.data as Supir
    },
    async update(id: string, payload: Partial<Supir>) {
        const { data } = await axios.put(API_ENDPOINTS.SUPIR_DETAIL(id), payload)
        return data.data as Supir
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SUPIR_DETAIL(id))
    },
}
