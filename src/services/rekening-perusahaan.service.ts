import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface RekeningPerusahaan {
    id_rekening_perusahaan: string
    id_perusahaan: string
    nama_bank: string
    nomor_rekening: string
    atas_nama_rekening: string | null
    utama: boolean
}

export type RekeningPerusahaanPayload = {
    nama_bank: string
    nomor_rekening: string
    atas_nama_rekening: string | null
    utama?: boolean
}

export const POLA_NOMOR_REKENING = /^[0-9][0-9\s.-]*$/

export const rekeningPerusahaanService = {
    async list(page = 1, limit = 10, search?: string) {
        const { data } = await axios.get(API_ENDPOINTS.REKENING_PERUSAHAAN, { params: { page, limit, search: search || undefined } })
        return data as { data: RekeningPerusahaan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.REKENING_PERUSAHAAN_DETAIL(id))
        return data.data as RekeningPerusahaan
    },
    async create(payload: RekeningPerusahaanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.REKENING_PERUSAHAAN, payload)
        return data.data as RekeningPerusahaan
    },
    async update(id: string, payload: Partial<RekeningPerusahaanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.REKENING_PERUSAHAAN_DETAIL(id), payload)
        return data.data as RekeningPerusahaan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.REKENING_PERUSAHAAN_DETAIL(id))
    },
}
