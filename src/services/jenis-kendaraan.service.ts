import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface JenisKendaraan {
    id_jenis_kendaraan: string
    id_perusahaan: string
    kode_jenis: string
    nama_jenis: string
    kapasitas_muatan: number | null
    aktif: boolean
}

export const jenisKendaraanService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_KENDARAAN, { params: { page, limit } })
        return data as { data: JenisKendaraan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_KENDARAAN_DETAIL(id))
        return data.data as JenisKendaraan
    },
    async create(payload: Omit<JenisKendaraan, 'id_jenis_kendaraan' | 'id_perusahaan'>) {
        const { data } = await axios.post(API_ENDPOINTS.JENIS_KENDARAAN, payload)
        return data.data as JenisKendaraan
    },
    async update(id: string, payload: Partial<Omit<JenisKendaraan, 'id_jenis_kendaraan'>>) {
        const { data } = await axios.put(API_ENDPOINTS.JENIS_KENDARAAN_DETAIL(id), payload)
        return data.data as JenisKendaraan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JENIS_KENDARAAN_DETAIL(id))
    },
}
