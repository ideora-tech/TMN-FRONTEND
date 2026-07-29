import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Vendor {
    id_vendor: string
    kode_vendor: string
    nama_vendor: string
    telepon?: string
    alamat?: string
    email?: string
    jenis_vendor?: string | null
    pic_nama?: string | null
    npwp?: string | null
    tanggal_bergabung?: string | null
    aktif: boolean
}

export interface KontrakVendor {
    id_kontrak_vendor: string
    id_vendor: string
    mekanisme: 'unit_only' | 'unit_driver' | 'full'
    nomor_kontrak?: string | null
    jenis_layanan?: string | null
    rate?: number | null
    satuan?: string | null
    pajak_persen?: number | null
    termin_pembayaran_hari?: number | null
    nilai_kontrak?: number
    tanggal_mulai?: string
    tanggal_selesai?: string
}

export interface RekeningVendor {
    id_rekening_vendor: string
    id_vendor: string
    nama_bank: string
    nomor_rekening: string
    atas_nama: string
    cabang: string | null
    mata_uang: string
}

export type RekeningVendorPayload = {
    nama_bank: string
    nomor_rekening: string
    atas_nama: string
    cabang?: string | null
    mata_uang?: string
}

export const vendorService = {
    async list(page = 1, limit = 15, search?: string) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR, { params: { page, limit, search: search || undefined } })
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
    async createKontrak(payload: Omit<KontrakVendor, 'id_kontrak_vendor'>) {
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR, payload)
        return data.data as KontrakVendor
    },
    async listRekening(idVendor: string) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR_REKENING(idVendor))
        return data.data as RekeningVendor[]
    },
    async createRekening(idVendor: string, payload: RekeningVendorPayload) {
        const { data } = await axios.post(API_ENDPOINTS.VENDOR_REKENING(idVendor), payload)
        return data.data as RekeningVendor
    },
    async updateRekening(idVendor: string, idRekening: string, payload: Partial<RekeningVendorPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.VENDOR_REKENING_UPDATE(idVendor, idRekening), payload)
        return data.data as RekeningVendor
    },
    async deleteRekening(idVendor: string, idRekening: string) {
        await axios.delete(API_ENDPOINTS.VENDOR_REKENING_DELETE(idVendor, idRekening))
    },
}
