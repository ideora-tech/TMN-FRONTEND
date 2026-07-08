import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Vendor {
    id_vendor: string
    kode_vendor: string
    nama_vendor: string
    telepon?: string
    alamat?: string
    email?: string
    aktif: boolean
}

export interface KontrakVendor {
    id_kontrak: string
    id_vendor: string
    mekanisme: 'unit_only' | 'unit_driver' | 'full'
    nilai_kontrak?: number
    tanggal_mulai?: string
    tanggal_selesai?: string
}

export const vendorService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR, { params: { page, limit: 15 } })
        return data as { data: Vendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR_DETAIL(id))
        return data.data as Vendor
    },
    async create(payload: Omit<Vendor, 'id_vendor'>) {
        const { data } = await axios.post(API_ENDPOINTS.VENDOR, payload)
        return data.data as Vendor
    },
    async update(id: string, payload: Partial<Vendor>) {
        const { data } = await axios.put(API_ENDPOINTS.VENDOR_DETAIL(id), payload)
        return data.data as Vendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.VENDOR_DETAIL(id))
    },
    async listKontrak(id_vendor: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR, { params: { id_vendor } })
        return data.data as KontrakVendor[]
    },
    async createKontrak(payload: Omit<KontrakVendor, 'id_kontrak'>) {
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR, payload)
        return data.data as KontrakVendor
    },
}
