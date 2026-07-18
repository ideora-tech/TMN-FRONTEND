import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPenugasan = 'pending' | 'aktif' | 'selesai' | 'batal'
export type SumberPenugasan = 'internal' | 'vendor'

export interface Penugasan {
    id_penugasan: string
    id_proyek: string
    id_armada: string | null
    id_supir: string | null
    id_karyawan: string | null
    tanggal_tugas: string | null
    status: StatusPenugasan
    estimasi_biaya?: number | null
    sumber: SumberPenugasan
    id_kontrak_vendor: string | null
    id_armada_vendor: string | null
    id_supir_vendor: string | null
    dibuat_pada: string
    diubah_pada: string
}

export const penugasanService = {
    async list(idProyek: string, page = 1, sumber?: SumberPenugasan, limit = 15) {
        const params: Record<string, string | number> = { id_proyek: idProyek, page, limit }
        if (sumber) params.sumber = sumber
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN, { params })
        return data as { data: Penugasan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listByArmada(idArmada: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN, { params: { id_armada: idArmada, page, limit } })
        return data as { data: Penugasan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listBySupir(idSupir: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN, { params: { id_supir: idSupir, page, limit } })
        return data as { data: Penugasan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN_DETAIL(id))
        return data.data as Penugasan
    },
    async create(payload: {
        id_proyek: string
        id_armada?: string
        id_supir?: string | null
        id_karyawan?: string
        tanggal_tugas?: string
        status?: string
        estimasi_biaya?: number | null
        sumber?: SumberPenugasan
        id_kontrak_vendor?: string
        id_armada_vendor?: string
        id_supir_vendor?: string | null
    }) {
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
