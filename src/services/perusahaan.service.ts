import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Perusahaan {
    id_perusahaan: string
    nama: string
    email: string | null
    telepon: string | null
    alamat: string | null
    id_zona: string | null
    id_mata_uang: string | null
    aktif: boolean
    dibuat_pada: string
}

export const perusahaanService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.PERUSAHAAN, { params: { page, limit: 15 } })
        return data as { data: Perusahaan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERUSAHAAN_DETAIL(id))
        return data.data as Perusahaan
    },
    async create(payload: Omit<Perusahaan, 'id_perusahaan' | 'aktif' | 'dibuat_pada'>) {
        const { data } = await axios.post(API_ENDPOINTS.PERUSAHAAN, payload)
        return data.data as Perusahaan
    },
    async update(id: string, payload: Partial<Omit<Perusahaan, 'id_perusahaan' | 'dibuat_pada'>>) {
        const { data } = await axios.put(API_ENDPOINTS.PERUSAHAAN_DETAIL(id), payload)
        return data.data as Perusahaan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PERUSAHAAN_DETAIL(id))
    },
}
