import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KontrakVendor {
    id_kontrak_vendor: string
    id_vendor: string
    mekanisme: 'unit_only' | 'unit_driver' | 'full'
    nomor_kontrak: string | null
    jenis_layanan: string | null
    rate: number | null
    satuan: string | null
    pajak_persen: number | null
    termin_pembayaran_hari: number | null
    nilai_kontrak: number | null
    tanggal_mulai: string | null
    tanggal_selesai: string | null
    status: string | null
    alasan_ditolak_internal?: string | null
    dibuat_pada: string
    diubah_pada: string
    vendor?: { id_vendor: string; nama_vendor: string }
}

export interface KontrakUnitInput {
    nopol: string
    merk?: string | null
    jenis?: string | null
    id_jenis_kendaraan?: string | null
    tahun?: number | null
    kapasitas?: string | null
    masa_berlaku_stnk?: string | null
    masa_berlaku_kir?: string | null
    supir_index?: number | null
}

export interface KontrakSupirInput {
    nama: string
    telepon?: string | null
    no_sim?: string | null
}

export interface BarisGagal {
    baris: number
    alasan: string
}

export interface HasilParseExcel<T> {
    baris_valid: T[]
    baris_gagal: BarisGagal[]
}

export const kontrakVendorService = {
    async list(page = 1, params?: Record<string, string>, search?: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR, { params: { page, limit: 15, ...params, search: search || undefined } })
        return data as { data: KontrakVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id))
        return data.data as KontrakVendor
    },
    async create(payload: { id_vendor: string; mekanisme: string; nomor_kontrak?: string | null; jenis_layanan?: string | null; rate?: number | null; satuan?: string | null; pajak_persen?: number | null; termin_pembayaran_hari?: number | null; nilai_kontrak?: number | null; tanggal_mulai?: string | null; tanggal_selesai?: string | null; unit?: KontrakUnitInput[]; supir?: KontrakSupirInput[]; salin_dari_kontrak?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR, payload)
        return { ...(data.data as KontrakVendor), _pesan: data.message as string | undefined }
    },
    async update(id: string, payload: Partial<{ mekanisme: string; nomor_kontrak: string | null; jenis_layanan: string | null; rate: number | null; satuan: string | null; pajak_persen: number | null; termin_pembayaran_hari: number | null; nilai_kontrak: number | null; tanggal_mulai: string | null; tanggal_selesai: string | null; status: string | null }>) {
        const { data } = await axios.put(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id), payload)
        return data.data as KontrakVendor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KONTRAK_VENDOR_DETAIL(id))
    },
    async ajukanApproval(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_AJUKAN_APPROVAL(id))
        return data.data as KontrakVendor
    },
    async parseUnit(file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_PARSE_UNIT, fd)
        return data.data as HasilParseExcel<KontrakUnitInput>
    },
    async parseSupir(file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_PARSE_SUPIR, fd)
        return data.data as HasilParseExcel<KontrakSupirInput>
    },
    async parsePasangan(file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_PARSE_PASANGAN, fd)
        return data.data as HasilParseExcel<PasanganInput>
    },
    async timpaUnit(id: string, file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_TIMPA_UNIT(id), fd)
        return data.data as HasilTimpaExcel
    },
    async timpaPasangan(id: string, file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_TIMPA_PASANGAN(id), fd)
        return data.data as HasilTimpaPasangan
    },
    async timpaSupir(id: string, file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.KONTRAK_VENDOR_TIMPA_SUPIR(id), fd)
        return data.data as HasilTimpaExcel
    },
}

export type PasanganInput = KontrakUnitInput & {
    driver_nama: string | null
    driver_telepon: string | null
    driver_no_sim: string | null
}

export interface HasilTimpaPasangan {
    ditambah: number
    diperbarui: number
    dihapus: number
    driver_ditambah: number
    driver_diperbarui: number
    driver_dilepas: number
    gagal: { label: string; alasan: string }[]
}

export interface HasilTimpaExcel {
    ditambah: number
    diperbarui: number
    dihapus: number
    gagal: { label: string; alasan: string }[]
}
