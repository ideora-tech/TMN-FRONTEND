import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Klien {
    id_klien: string
    kode_klien: string
    nama_klien: string
    email?: string
    telepon?: string
    alamat?: string
    kontak_pic?: string
    aktif: boolean
}

export interface KlienProyek {
    id_proyek: string
    kode_proyek: string
    nama_proyek: string
    status: 'draft' | 'aktif' | 'selesai' | 'batal'
    tanggal_mulai?: string | null
    tanggal_selesai?: string | null
}

export const klienService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.KLIEN, { params: { page, limit } })
        return data as { data: Klien[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KLIEN_DETAIL(id))
        return data.data as Klien
    },
    async create(payload: Omit<Klien, 'id_klien'>) {
        const { data } = await axios.post(API_ENDPOINTS.KLIEN, payload)
        return data.data as Klien
    },
    async update(id: string, payload: Partial<Omit<Klien, 'id_klien'>>) {
        const { data } = await axios.put(API_ENDPOINTS.KLIEN_DETAIL(id), payload)
        return data.data as Klien
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KLIEN_DETAIL(id))
    },
    async listProyek(id: string, page = 1, limit = 10) {
        const { data } = await axios.get(API_ENDPOINTS.KLIEN_PROYEK(id), { params: { page, limit } })
        return data as { data: KlienProyek[]; meta: { page: number; limit: number; total: number; totalPages: number } }
    },
}
