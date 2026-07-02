import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Klien {
    id_klien: string
    kode_klien: string
    nama_klien: string
    email?: string
    telepon?: string
    alamat?: string
    kontak_pic?: string
    aktif: boolean
}

export const klienService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.KLIEN, { params: { page, limit: 15 } })
        return data as { data: Klien[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KLIEN_DETAIL(id))
        return data.data as Klien
    },
    async create(payload: Omit<Klien, 'id_klien'>) {
        const { data } = await axios.post(API_ENDPOINTS.KLIEN, payload)
        return data.data as Klien
    },
    async update(id: string, payload: Partial<Omit<Klien, 'id_klien'>>) {
        const { data } = await axios.put(API_ENDPOINTS.KLIEN_DETAIL(id), payload)
        return data.data as Klien
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KLIEN_DETAIL(id))
    },
}
