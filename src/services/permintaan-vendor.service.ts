import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type PermintaanVendorStatus = 'draft' | 'menunggu_approval' | 'disetujui' | 'ditolak' | 'diproses' | 'dikontrakkan' | 'selesai' | 'dibatalkan' | 'ditolak_pengadaan'
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
    id_penawaran?: string | null
    nomor_penawaran?: string | null
    id_jenis_kendaraan: string | null
    nama_jenis?: string | null
    nama_jenis_kendaraan?: string | null
    jumlah_unit: number
    unit_diminta?: UnitDiminta[]
    mekanisme: PermintaanVendorMekanisme
    periode_dari: string | null
    periode_sampai: string | null
    catatan: string | null
    harga_penawaran?: number | null
    status: PermintaanVendorStatus
    alasan_ditolak: string | null
    id_kontrak_vendor: string | null
    nomor_kontrak?: string | null
    diproses_oleh?: string | null
    nama_diproses_oleh?: string | null
    diproses_pada?: string | null
    alasan_batal?: string | null
    disetujui_pada?: string | null
    dikontrakkan_pada?: string | null
    alasan_tolak_pengadaan?: string | null
    ditolak_pengadaan_oleh?: string | null
    nama_ditolak_pengadaan_oleh?: string | null
    ditolak_pengadaan_pada?: string | null
    lama_pemenuhan_menit?: number | null
    pemenuhan_berjalan?: boolean
    dibuat_oleh?: string | null
    dibuat_pada?: string | null
    diubah_pada?: string | null
}

export interface UnitDimintaPayload {
    id_jenis_kendaraan?: string | null
    jumlah_unit: number
}

export interface PermintaanVendorPayload {
    id_proyek?: string | null
    id_penawaran?: string | null
    unit: UnitDimintaPayload[]
    mekanisme: string
    periode_dari?: string | null
    periode_sampai?: string | null
    catatan?: string | null
    harga_penawaran?: number | null
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
        return data as { data: PermintaanVendor[]; meta: { page: number; total: number; totalPages: number; limit: number; ringkasan?: Partial<Record<PermintaanVendorStatus, number>>; kpi?: { jumlah_terpenuhi: number; rata_rata_menit: number | null } } }
    },
    async jumlahAktif() {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_VENDOR_JUMLAH_AKTIF)
        return data.data as { jumlah: number; disetujui: number; diproses: number }
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
    async proses(id: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_VENDOR_PROSES(id))
        return data.data as PermintaanVendor
    },
    async revisi(id: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_VENDOR_REVISI(id))
        return data.data as PermintaanVendor
    },
    async tolak(id: string, alasan: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_VENDOR_TOLAK(id), { alasan })
        return data.data as PermintaanVendor
    },
    async batal(id: string, alasan: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_VENDOR_BATAL(id), { alasan })
        return data.data as PermintaanVendor
    },
}
