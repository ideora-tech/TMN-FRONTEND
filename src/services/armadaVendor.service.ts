import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface ArmadaVendor {
    id_armada_vendor: string
    id_vendor: string
    nopol: string
    merk?: string | null
    jenis?: string | null
    tahun?: number | null
    aktif: boolean
    nama_vendor?: string
    dibuat_pada?: string
    diubah_pada?: string
}

export const armadaVendorService = {
    async list(page = 1, limit = 15, idVendor?: string) {
        const params: Record<string, string | number> = { page, limit }
        if (idVendor) params.id_vendor = idVendor
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_VENDOR, { params })
        return data as { data: ArmadaVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_VENDOR_DETAIL(id))
        return data.data as ArmadaVendor
    },
    async create(payload: { id_vendor: string; nopol: string; merk?: string | null; jenis?: string | null; tahun?: number | null; aktif?: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_VENDOR, payload)
        return data.data as ArmadaVendor
    },
    async update(id: string, payload: Partial<ArmadaVendor>) {
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_VENDOR_DETAIL(id), payload)
        return data.data as ArmadaVendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_VENDOR_DETAIL(id))
    },
}
