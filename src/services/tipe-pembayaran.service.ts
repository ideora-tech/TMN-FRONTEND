import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface TipePembayaran {
    id_tipe_pembayaran: string
    id_perusahaan: string
    kode_tipe: string
    nama_tipe: string
    aktif: boolean
}

export const tipePembayaranService = {
    async list(page = 1, limit = 15, search?: string, aktif?: '' | '1' | '0') {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PEMBAYARAN, { params: { page, limit, search: search || undefined, aktif: aktif || undefined } })
        return data as { data: TipePembayaran[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async opsiAktif() {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PEMBAYARAN_OPSI_AKTIF)
        return data.data as TipePembayaran[]
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PEMBAYARAN_DETAIL(id))
        return data.data as TipePembayaran
    },
    async create(payload: Omit<TipePembayaran, 'id_tipe_pembayaran' | 'id_perusahaan'>) {
        const { data } = await axios.post(API_ENDPOINTS.TIPE_PEMBAYARAN, payload)
        return data.data as TipePembayaran
    },
    async update(id: string, payload: Partial<Omit<TipePembayaran, 'id_tipe_pembayaran'>>) {
        const { data } = await axios.put(API_ENDPOINTS.TIPE_PEMBAYARAN_DETAIL(id), payload)
        return data.data as TipePembayaran
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.TIPE_PEMBAYARAN_DETAIL(id))
    },
}
