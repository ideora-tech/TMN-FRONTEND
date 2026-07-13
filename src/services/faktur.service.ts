import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface FakturItem {
    deskripsi: string
    qty: number
    harga_satuan: number
    subtotal: number
}

export interface Faktur {
    id_faktur: string
    nomor_faktur: string
    total: number
    status: 'draft' | 'terkirim' | 'lunas' | 'batal'
    tanggal_faktur?: string
    jatuh_tempo?: string
    items?: FakturItem[]
}

export const fakturService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR, { params: { page, limit: 15 } })
        return data as { data: Faktur[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listByKlien(idKlien: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR, { params: { id_klien: idKlien, page, limit } })
        return data as { data: Faktur[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR_DETAIL(id))
        return data.data as Faktur
    },
    async create(payload: {
        nomor_faktur: string
        id_proyek?: string
        id_klien?: string
        tanggal_faktur?: string
        jatuh_tempo?: string
        items: FakturItem[]
    }) {
        const { data } = await axios.post(API_ENDPOINTS.FAKTUR, payload)
        return data.data as Faktur
    },
    async updateStatus(id: string, status: string) {
        const { data } = await axios.patch(API_ENDPOINTS.FAKTUR_STATUS(id), { status })
        return data.data as Faktur
    },
}
