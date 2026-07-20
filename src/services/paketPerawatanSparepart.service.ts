import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface PaketPerawatanSparepart {
    id_paket_perawatan_sparepart: string
    id_perusahaan: string
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    id_sparepart: string
    nama_jenis_perawatan: string | null
    nama_jenis_kendaraan: string | null
    nama_sparepart: string | null
    satuan_sparepart: string | null
    qty_standar: number
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type PaketPerawatanSparepartPayload = {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    id_sparepart: string
    qty_standar: number
    aktif?: boolean
}

export interface PaketResolusiItem {
    id_sparepart: string
    nama_sparepart: string
    satuan_sparepart: string
    qty_standar: number
    harga_standar: number
}

export const paketPerawatanSparepartService = {
    async list(params?: { page?: number; limit?: number; id_jenis_perawatan?: string; id_jenis_kendaraan?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART, { params })
        return data as { data: PaketPerawatanSparepart[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART_DETAIL(id))
        return data.data as PaketPerawatanSparepart
    },
    async create(payload: PaketPerawatanSparepartPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART, payload)
        return data.data as PaketPerawatanSparepart
    },
    async update(id: string, payload: Partial<PaketPerawatanSparepartPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART_DETAIL(id), payload)
        return data.data as PaketPerawatanSparepart
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART_DETAIL(id))
    },
    async resolusi(params: { id_jenis_perawatan: string; id_jenis_kendaraan: string }): Promise<PaketResolusiItem[]> {
        const { data } = await axios.get(API_ENDPOINTS.PAKET_PERAWATAN_SPAREPART_RESOLUSI, { params })
        return (data?.data ?? []) as PaketResolusiItem[]
    },
}
