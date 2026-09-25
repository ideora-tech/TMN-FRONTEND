import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KategoriBarang {
    id_kategori_barang: string
    nama: string
    keterangan: string | null
    aktif: boolean
}

export interface Barang {
    id_barang: string
    kode: string
    nama: string
    id_kategori_barang: string | null
    nama_kategori: string | null
    satuan: string
    harga_standar: number
    stok: number
    stok_minimum: number
    stok_menipis: boolean
    aktif: boolean
    dibuat_pada: string
}

export interface BarangMutasi {
    id_mutasi: string
    jenis: 'masuk' | 'keluar' | 'penyesuaian'
    qty: number
    harga: number | null
    id_permintaan_pembelian: string | null
    nomor_permintaan: string | null
    pemakai: string | null
    keterangan: string | null
    tanggal: string
    dibuat_pada: string
}

export type BarangPayload = {
    nama: string
    id_kategori_barang?: string | null
    satuan?: string
    harga_standar?: number
    stok_minimum?: number
    aktif?: boolean
}

type ListMeta = { page: number; total: number; totalPages: number; limit: number; ringkasan?: { stok_menipis: number } }

export const barangService = {
    async list(params?: { page?: number; limit?: number; search?: string; id_kategori_barang?: string; stok_menipis?: '1' }) {
        const { data } = await axios.get(API_ENDPOINTS.BARANG, { params })
        return data as { data: Barang[]; meta: ListMeta }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.BARANG_DETAIL(id))
        return data.data as Barang
    },
    async create(payload: BarangPayload) {
        const { data } = await axios.post(API_ENDPOINTS.BARANG, payload)
        return data.data as Barang
    },
    async buatCepat(payload: { nama: string; satuan: string; id_kategori_barang?: string | null; harga_standar?: number }) {
        const { data } = await axios.post(API_ENDPOINTS.BARANG_BUAT_CEPAT, payload)
        return data.data as Barang
    },
    async update(id: string, payload: Partial<BarangPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.BARANG_DETAIL(id), payload)
        return data.data as Barang
    },
    async remove(id: string) {
        await axios.delete(API_ENDPOINTS.BARANG_DETAIL(id))
    },
    async listMutasi(id: string, params?: { page?: number; limit?: number }) {
        const { data } = await axios.get(API_ENDPOINTS.BARANG_MUTASI(id), { params })
        return data as { data: BarangMutasi[]; meta: ListMeta }
    },
    async pemakaian(id: string, payload: { qty: number; tanggal: string; pemakai: string; keterangan?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.BARANG_PEMAKAIAN(id), payload)
        return data.data as Barang
    },
    async penyesuaian(id: string, payload: { stok_baru: number; keterangan: string }) {
        const { data } = await axios.post(API_ENDPOINTS.BARANG_PENYESUAIAN(id), payload)
        return data.data as Barang
    },
    async listKategori(hanyaAktif = false) {
        const { data } = await axios.get(API_ENDPOINTS.KATEGORI_BARANG, { params: hanyaAktif ? { hanya_aktif: '1' } : undefined })
        return data.data as KategoriBarang[]
    },
    async createKategori(payload: { nama: string; keterangan?: string | null; aktif?: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.KATEGORI_BARANG, payload)
        return data.data as KategoriBarang
    },
    async updateKategori(id: string, payload: { nama: string; keterangan?: string | null; aktif?: boolean }) {
        const { data } = await axios.put(API_ENDPOINTS.KATEGORI_BARANG_DETAIL(id), payload)
        return data.data as KategoriBarang
    },
    async removeKategori(id: string) {
        await axios.delete(API_ENDPOINTS.KATEGORI_BARANG_DETAIL(id))
    },
}
