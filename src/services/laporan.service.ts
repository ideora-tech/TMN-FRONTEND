import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Laporan {
    id_laporan: string
    id_proyek: string
    ringkasan?: string
    total_trip: number
    diserahkan_pada?: string
}

export const laporanService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN, { params: { page, limit: 15 } })
        return data as { data: Laporan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN_DETAIL(id))
        return data.data as Laporan
    },
    async create(payload: { id_proyek: string; ringkasan?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.LAPORAN, payload)
        return data.data as Laporan
    },
}
