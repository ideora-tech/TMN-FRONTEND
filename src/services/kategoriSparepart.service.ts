import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KategoriSparepart {
    id_kategori_sparepart: string
    id_perusahaan: string
    nama: string
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type KategoriSparepartPayload = {
    nama: string
    keterangan?: string | null
    aktif?: boolean
}

export const kategoriSparepartService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.KATEGORI_SPAREPART, { params: { page, limit } })
        return data as { data: KategoriSparepart[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KATEGORI_SPAREPART_DETAIL(id))
        return data.data as KategoriSparepart
    },
    async create(payload: KategoriSparepartPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KATEGORI_SPAREPART, payload)
        return data.data as KategoriSparepart
    },
    async update(id: string, payload: Partial<KategoriSparepartPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.KATEGORI_SPAREPART_DETAIL(id), payload)
        return data.data as KategoriSparepart
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KATEGORI_SPAREPART_DETAIL(id))
    },
}
