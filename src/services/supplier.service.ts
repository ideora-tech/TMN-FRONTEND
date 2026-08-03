import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Supplier {
    id_supplier: string
    nama: string
    telepon: string | null
    alamat: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export type SupplierPayload = {
    nama: string
    telepon?: string | null
    alamat?: string | null
    aktif?: boolean
}

export const supplierService = {
    async list(params?: { page?: number; limit?: number; search?: string; aktif?: number }) {
        const { data } = await axios.get(API_ENDPOINTS.SUPPLIER, { params })
        return data as { data: Supplier[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async create(payload: SupplierPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SUPPLIER, payload)
        return data.data as Supplier
    },
    async update(id: string, payload: Partial<SupplierPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.SUPPLIER_DETAIL(id), payload)
        return data.data as Supplier
    },
    async remove(id: string) {
        await axios.delete(API_ENDPOINTS.SUPPLIER_DETAIL(id))
    },
}
