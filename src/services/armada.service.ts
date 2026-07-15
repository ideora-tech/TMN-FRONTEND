import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Armada {
    id_armada: string
    nopol: string
    merk: string
    model?: string
    tahun: number
    status: 'aktif' | 'servis' | 'nonaktif'
    id_jenis_kendaraan?: string
}

export const armadaService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA, { params: { page, limit } })
        return data as { data: Armada[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_DETAIL(id))
        return data.data as Armada
    },
    async create(payload: Omit<Armada, 'id_armada'>) {
        const { data } = await axios.post(API_ENDPOINTS.ARMADA, payload)
        return data.data as Armada
    },
    async update(id: string, payload: Partial<Armada>) {
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_DETAIL(id), payload)
        return data.data as Armada
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_DETAIL(id))
    },
}
