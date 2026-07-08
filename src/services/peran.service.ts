import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Peran {
    id_peran: string
    id_perusahaan: string | null
    kode_peran: string
    nama_peran: string
    is_platform: boolean
    aktif: boolean
}

export const peranService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.PERAN, { params: { page, limit: 15 } })
        return data as { data: Peran[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERAN_DETAIL(id))
        return data.data as Peran
    },
    async create(payload: Omit<Peran, 'id_peran'>) {
        const { data } = await axios.post(API_ENDPOINTS.PERAN, payload)
        return data.data as Peran
    },
    async update(id: string, payload: Partial<Omit<Peran, 'id_peran'>>) {
        const { data } = await axios.put(API_ENDPOINTS.PERAN_DETAIL(id), payload)
        return data.data as Peran
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PERAN_DETAIL(id))
    },
}
