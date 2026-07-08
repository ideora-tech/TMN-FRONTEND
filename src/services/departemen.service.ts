import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Departemen {
    id_departemen: string
    id_perusahaan: string
    id_departemen_induk: string | null
    kode_departemen: string
    nama_departemen: string
    aktif: boolean
}

export const departemenService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.DEPARTEMEN, { params: { page, limit: 15 } })
        return data as { data: Departemen[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.DEPARTEMEN_DETAIL(id))
        return data.data as Departemen
    },
    async create(payload: Omit<Departemen, 'id_departemen' | 'id_perusahaan'>) {
        const { data } = await axios.post(API_ENDPOINTS.DEPARTEMEN, payload)
        return data.data as Departemen
    },
    async update(id: string, payload: Partial<Omit<Departemen, 'id_departemen'>>) {
        const { data } = await axios.put(API_ENDPOINTS.DEPARTEMEN_DETAIL(id), payload)
        return data.data as Departemen
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.DEPARTEMEN_DETAIL(id))
    },
}
