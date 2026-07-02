import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Rekonsiliasi {
    id_rekonsiliasi: string
    id_faktur: string
    catatan_klien?: string
    catatan_keuangan?: string
    status: 'pending' | 'selesai'
    diselesaikan_pada?: string
}

export const rekonsiliasiService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.REKONSILIASI, { params: { page, limit: 15 } })
        return data as { data: Rekonsiliasi[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.REKONSILIASI_DETAIL(id))
        return data.data as Rekonsiliasi
    },
    async create(payload: { id_faktur: string; catatan_klien?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.REKONSILIASI, payload)
        return data.data as Rekonsiliasi
    },
    async update(id: string, payload: { catatan_keuangan?: string; status?: string }) {
        const { data } = await axios.put(API_ENDPOINTS.REKONSILIASI_DETAIL(id), payload)
        return data.data as Rekonsiliasi
    },
}
