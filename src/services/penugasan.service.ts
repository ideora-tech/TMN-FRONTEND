import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPenugasan = 'pending' | 'aktif' | 'selesai' | 'batal'

export interface Penugasan {
    id_penugasan: string
    id_proyek: string
    id_armada: string | null
    id_karyawan: string | null
    tanggal_tugas: string | null
    status: StatusPenugasan
    dibuat_pada: string
    diubah_pada: string
}

export const penugasanService = {
    async list(idProyek: string, page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN, { params: { id_proyek: idProyek, page, limit: 15 } })
        return data as { data: Penugasan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN_DETAIL(id))
        return data.data as Penugasan
    },
    async create(payload: { id_proyek: string; id_armada?: string; id_karyawan?: string; tanggal_tugas?: string; status?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.PENUGASAN, payload)
        return data.data as Penugasan
    },
    async update(id: string, payload: Partial<Omit<Penugasan, 'id_penugasan' | 'dibuat_pada' | 'diubah_pada'>>) {
        const { data } = await axios.put(API_ENDPOINTS.PENUGASAN_DETAIL(id), payload)
        return data.data as Penugasan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PENUGASAN_DETAIL(id))
    },
}
