import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Sparepart {
    id_sparepart: string
    id_perusahaan: string
    kode: string
    nama: string
    id_kategori_sparepart: string | null
    nama_kategori_sparepart: string | null
    satuan: string
    harga_standar: number
    stok: number
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export interface SparepartMutasi {
    id_mutasi: string
    id_sparepart: string
    jenis: 'masuk' | 'keluar' | 'penyesuaian'
    qty: number
    harga: number | null
    id_perawatan: string | null
    keterangan: string | null
    tanggal: string
    dibuat_pada: string
}

export type SparepartPayload = {
    kode: string
    nama: string
    id_kategori_sparepart?: string | null
    satuan?: string
    harga_standar?: number
    aktif?: boolean
}

export type StokPayload = {
    jenis: 'masuk' | 'penyesuaian'
    qty: number
    harga?: number | null
    keterangan?: string | null
}

export const sparepartService = {
    async list(params?: { page?: number; limit?: number; search?: string; id_kategori_sparepart?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART, { params })
        return data as { data: Sparepart[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART_DETAIL(id))
        return data.data as Sparepart
    },
    async create(payload: SparepartPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SPAREPART, payload)
        return data.data as Sparepart
    },
    async update(id: string, payload: Partial<SparepartPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.SPAREPART_DETAIL(id), payload)
        return data.data as Sparepart
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SPAREPART_DETAIL(id))
    },
    async tambahStok(id: string, payload: StokPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SPAREPART_STOK(id), payload)
        return data.data as Sparepart
    },
    async listMutasi(id: string, page = 1, limit = 10) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART_MUTASI(id), { params: { page, limit } })
        return data as { data: SparepartMutasi[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
}
