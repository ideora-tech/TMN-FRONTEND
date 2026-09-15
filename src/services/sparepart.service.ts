import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface HargaBeliTerakhir {
    harga: number
    tanggal: string
    id_pembelian: string | null
    nomor_pengajuan: string | null
    nama_supplier: string | null
}

export interface Sparepart {
    id_sparepart: string
    id_perusahaan: string
    kode: string
    nama: string
    serial_number: string | null
    merek: string | null
    tahun: number | null
    id_kategori_sparepart: string | null
    nama_kategori_sparepart: string | null
    satuan: string
    harga_standar: number
    stok: number
    aktif: boolean
    harga_beli_terakhir?: HargaBeliTerakhir | null
    dibuat_pada: string
    diubah_pada: string | null
}

export type SumberRiwayatHarga = 'manual' | 'import' | 'migrasi'

export interface RiwayatHargaSparepart {
    id_riwayat: string
    tanggal: string
    harga_lama: number | null
    harga_baru: number
    selisih: number | null
    persen: number | null
    sumber: SumberRiwayatHarga
    keterangan: string | null
    dibuat_oleh_nama: string | null
}

export interface SparepartMutasi {
    id_mutasi: string
    id_sparepart: string
    jenis: 'masuk' | 'keluar' | 'penyesuaian'
    qty: number
    harga: number | null
    id_perawatan: string | null
    id_pembelian: string | null
    keterangan: string | null
    tanggal: string
    dibuat_pada: string
    dibuat_oleh_nama?: string | null
}

export type SatuanSparepart = 'pcs' | 'set' | 'liter'

export const SATUAN_SPAREPART_OPTIONS: { value: SatuanSparepart; label: string }[] = [
    { value: 'pcs',   label: 'Pcs' },
    { value: 'set',   label: 'Set' },
    { value: 'liter', label: 'Liter' },
]

export type SparepartPayload = {
    kode: string
    nama: string
    serial_number: string
    merek?: string | null
    tahun?: number | null
    id_kategori_sparepart?: string | null
    satuan?: string
    harga_standar?: number
    keterangan_harga?: string | null
    aktif?: boolean
}

export type StokPayload = {
    jenis: 'penyesuaian'
    qty: number
    keterangan: string
}

export interface ImportSparepartHasil {
    berhasil: number
    gagal: { baris: number; nama: string; alasan: string }[]
}

async function unduhExcel(url: string, namaFile: string) {
    const res = await axios.get(url, { responseType: 'blob' })
    const href = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = href
    link.download = namaFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
}

export const sparepartService = {
    async list(params?: { page?: number; limit?: number; search?: string; id_kategori_sparepart?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART, { params })
        return data as { data: Sparepart[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART_DETAIL(id))
        return data.data as Sparepart
    },
    async create(payload: SparepartPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SPAREPART, payload)
        return data.data as Sparepart
    },
    async update(id: string, payload: Partial<SparepartPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.SPAREPART_DETAIL(id), payload)
        return data.data as Sparepart
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SPAREPART_DETAIL(id))
    },
    async penyesuaianStok(id: string, payload: StokPayload) {
        const { data } = await axios.post(API_ENDPOINTS.SPAREPART_STOK(id), payload)
        return data.data as Sparepart
    },
    async listMutasi(id: string, page = 1, limit = 10) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART_MUTASI(id), { params: { page, limit } })
        return data as { data: SparepartMutasi[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listRiwayatHarga(id: string, page = 1, limit = 20) {
        const { data } = await axios.get(API_ENDPOINTS.SPAREPART_RIWAYAT_HARGA(id), { params: { page, limit } })
        return data as { data: RiwayatHargaSparepart[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async downloadTemplate() {
        await unduhExcel(API_ENDPOINTS.SPAREPART_IMPORT_TEMPLATE, 'template-import-sparepart.xlsx')
    },
    async importExcel(file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.SPAREPART_IMPORT, fd)
        return data.data as ImportSparepartHasil
    },
}
