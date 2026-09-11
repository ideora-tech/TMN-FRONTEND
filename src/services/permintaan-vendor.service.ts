import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type PermintaanVendorStatus = 'draft' | 'menunggu_approval' | 'disetujui' | 'ditolak' | 'dikontrakkan'
export type PermintaanVendorMekanisme = 'unit_only' | 'unit_driver' | 'full'

export interface UnitDiminta {
    id_jenis_kendaraan: string | null
    nama_jenis_kendaraan: string | null
    jumlah_unit: number
}

export interface PermintaanVendor {
    id_permintaan: string
    nomor_permintaan: string
    id_proyek: string | null
    nama_proyek?: string | null
    id_jenis_kendaraan: string | null
    nama_jenis?: string | null
    nama_jenis_kendaraan?: string | null
    jumlah_unit: number
    unit_diminta?: UnitDiminta[]
    mekanisme: PermintaanVendorMekanisme
    periode_dari: string | null
    periode_sampai: string | null
    catatan: string | null
    status: PermintaanVendorStatus
    alasan_ditolak: string | null
    id_kontrak_vendor: string | null
    nomor_kontrak?: string | null
    dibuat_pada?: string | null
    diubah_pada?: string | null
}

export interface UnitDimintaPayload {
    id_jenis_kendaraan?: string | null
    jumlah_unit: number
}

export interface PermintaanVendorPayload {
    id_proyek?: string | null
    unit: UnitDimintaPayload[]
    mekanisme: string
    periode_dari?: string | null
    periode_sampai?: string | null
    catatan?: string | null
}

export const namaJenisPermintaan = (p: PermintaanVendor) =>
    p.nama_jenis ?? p.nama_jenis_kendaraan ?? null

export const itemUnitDiminta = (p: PermintaanVendor): UnitDiminta[] =>
    (p.unit_diminta && p.unit_diminta.length > 0)
        ? p.unit_diminta
        : [{ id_jenis_kendaraan: p.id_jenis_kendaraan, nama_jenis_kendaraan: namaJenisPermintaan(p), jumlah_unit: p.jumlah_unit }]

export const ringkasanUnitDiminta = (p: PermintaanVendor): string =>
    itemUnitDiminta(p).map(u => `${u.jumlah_unit} ${u.nama_jenis_kendaraan ?? 'unit'}`).join(' + ')

export const ringkasanJenisDiminta = (p: PermintaanVendor): string =>
    itemUnitDiminta(p).map(u => `${Number(u.jumlah_unit) > 1 ? `${u.jumlah_unit} ` : ''}${u.nama_jenis_kendaraan ?? 'unit'}`).join(' + ')

export const permintaanVendorService = {
    async list(page = 1, params?: Record<string, string | number | undefined>) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_VENDOR, { params: { page, limit: 10, ...params } })
        return data as { data: PermintaanVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_VENDOR_DETAIL(id))
        return data.data as PermintaanVendor
    },
    async create(payload: PermintaanVendorPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PERMINTAAN_VENDOR, payload)
        return data.data as PermintaanVendor
    },
    async update(id: string, payload: Partial<PermintaanVendorPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.PERMINTAAN_VENDOR_DETAIL(id), payload)
        return data.data as PermintaanVendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PERMINTAAN_VENDOR_DETAIL(id))
    },
    async ajukanApproval(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PERMINTAAN_VENDOR_AJUKAN_APPROVAL(id))
        return data.data as PermintaanVendor
    },
}
