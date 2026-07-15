import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface SupirVendor {
    id_supir_vendor: string
    id_vendor: string
    nama: string
    telepon?: string | null
    no_sim?: string | null
    aktif: boolean
    nama_vendor?: string
    dibuat_pada?: string
    diubah_pada?: string
}

export const supirVendorService = {
    async list(page = 1, limit = 15, idVendor?: string) {
        const params: Record<string, string | number> = { page, limit }
        if (idVendor) params.id_vendor = idVendor
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_VENDOR, { params })
        return data as { data: SupirVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_VENDOR_DETAIL(id))
        return data.data as SupirVendor
    },
    async create(payload: { id_vendor: string; nama: string; telepon?: string | null; no_sim?: string | null; aktif?: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.SUPIR_VENDOR, payload)
        return data.data as SupirVendor
    },
    async update(id: string, payload: Partial<SupirVendor>) {
        const { data } = await axios.put(API_ENDPOINTS.SUPIR_VENDOR_DETAIL(id), payload)
        return data.data as SupirVendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SUPIR_VENDOR_DETAIL(id))
    },
}
