import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Shift {
    id_shift: string
    id_perusahaan: string
    nama: string
    jam_mulai: string
    jam_selesai: string
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type ShiftPayload = {
    nama: string
    jam_mulai: string
    jam_selesai: string
    aktif?: boolean
}

export const shiftService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.SHIFT, { params: { page, limit } })
        return data as { data: Shift[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SHIFT_DETAIL(id))
        return data.data as Shift
    },
    async create(payload: ShiftPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SHIFT, payload)
        return data.data as Shift
    },
    async update(id: string, payload: Partial<ShiftPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.SHIFT_DETAIL(id), payload)
        return data.data as Shift
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SHIFT_DETAIL(id))
    },
}
