import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KontrakVendor {
    id_kontrak_vendor: string
    id_vendor: string
    mekanisme: 'unit_only' | 'unit_driver' | 'full'
    nilai_kontrak: number | null
    tanggal_mulai: string | null
    tanggal_selesai: string | null
    status: string | null
    dibuat_pada: string
    diubah_pada: string
    vendor?: { id_vendor: string; nama_vendor: string }
}

export const kontrakVendorService = {
    async list(page = 1, params?: Record<string, string>) {
        const { data } = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR, { params: { page, limit: 15, ...params } })
        return data as { data: KontrakVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id))
        return data.data as KontrakVendor
    },
    async create(payload: { id_vendor: string; mekanisme: string; nilai_kontrak?: number | null; tanggal_mulai?: string | null; tanggal_selesai?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR, payload)
        return data.data as KontrakVendor
    },
    async update(id: string, payload: Partial<{ mekanisme: string; nilai_kontrak: number | null; tanggal_mulai: string | null; tanggal_selesai: string | null; status: string | null }>) {
        const { data } = await axios.put(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id), payload)
        return data.data as KontrakVendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id))
    },
}
