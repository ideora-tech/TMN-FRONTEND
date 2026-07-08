import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Modul {
    id_modul: string
    kode_modul: string
    nama_modul: string
    urutan: number
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
}

export const modulService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.MODUL, { params: { page, limit: 50 } })
        return data as { data: Modul[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.MODUL_DETAIL(id))
        return data.data as Modul
    },
    async create(payload: Omit<Modul, 'id_modul' | 'dibuat_pada' | 'diubah_pada'>) {
        const { data } = await axios.post(API_ENDPOINTS.MODUL, payload)
        return data.data as Modul
    },
    async update(id: string, payload: Partial<Omit<Modul, 'id_modul' | 'dibuat_pada' | 'diubah_pada'>>) {
        const { data } = await axios.put(API_ENDPOINTS.MODUL_DETAIL(id), payload)
        return data.data as Modul
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.MODUL_DETAIL(id))
    },
}
