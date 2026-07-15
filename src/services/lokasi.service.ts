import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Lokasi {
    id_lokasi: string
    id_perusahaan: string
    nama_lokasi: string
    alamat: string | null
    kota: string | null
    aktif: boolean
    dibuat_pada: string
}

export const lokasiService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.LOKASI, { params: { page, limit } })
        return data as { data: Lokasi[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.LOKASI_DETAIL(id))
        return data.data as Lokasi
    },
    async create(payload: Omit<Lokasi, 'id_lokasi' | 'id_perusahaan' | 'dibuat_pada'>) {
        const { data } = await axios.post(API_ENDPOINTS.LOKASI, payload)
        return data.data as Lokasi
    },
    async update(id: string, payload: Partial<Omit<Lokasi, 'id_lokasi' | 'id_perusahaan' | 'dibuat_pada'>>) {
        const { data } = await axios.put(API_ENDPOINTS.LOKASI_DETAIL(id), payload)
        return data.data as Lokasi
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.LOKASI_DETAIL(id))
    },
}
