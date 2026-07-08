import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Jabatan {
    id_jabatan: string
    id_perusahaan: string
    id_departemen: string | null
    id_peran: string | null
    kode_jabatan: string
    nama_jabatan: string
    level: number
    aktif: boolean
}

export const jabatanService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.JABATAN, { params: { page, limit: 15 } })
        return data as { data: Jabatan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JABATAN_DETAIL(id))
        return data.data as Jabatan
    },
    async create(payload: Omit<Jabatan, 'id_jabatan' | 'id_perusahaan'>) {
        const { data } = await axios.post(API_ENDPOINTS.JABATAN, payload)
        return data.data as Jabatan
    },
    async update(id: string, payload: Partial<Omit<Jabatan, 'id_jabatan'>>) {
        const { data } = await axios.put(API_ENDPOINTS.JABATAN_DETAIL(id), payload)
        return data.data as Jabatan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JABATAN_DETAIL(id))
    },
}
