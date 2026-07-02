import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Jadwal {
    id_jadwal: string
    id_penugasan: string
    tgl_keberangkatan?: string
    rute?: string
    status: 'terjadwal' | 'berjalan' | 'selesai' | 'dibatalkan'
}

export const jadwalService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL, { params: { page, limit: 15 } })
        return data as { data: Jadwal[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL_DETAIL(id))
        return data.data as Jadwal
    },
}
