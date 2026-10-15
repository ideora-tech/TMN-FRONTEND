import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KomponenUangJalan {
    id_komponen_uang_jalan: string
    nama: string
    urutan: number
    aktif: boolean
    dibuat_pada?: string
    diubah_pada?: string | null
}

export type KomponenUangJalanPayload = {
    nama: string
    urutan: number
    aktif: boolean
}

export interface RincianKomponenUangJalan {
    id_komponen_uang_jalan: string | null
    nama_komponen: string
    nominal: number
    aktif?: boolean
}

export const komponenUangJalanService = {
    async list(page = 1, limit = 10, search?: string, aktif?: '' | '1' | '0') {
        const { data } = await axios.get(API_ENDPOINTS.KOMPONEN_UANG_JALAN, {
            params: { page, limit, search: search || undefined, aktif: aktif || undefined },
        })
        return data as { data: KomponenUangJalan[]; meta: { page: number; limit: number; total: number; totalPages: number } }
    },
    async opsi() {
        const { data } = await axios.get(API_ENDPOINTS.KOMPONEN_UANG_JALAN_OPSI)
        return data.data as KomponenUangJalan[]
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KOMPONEN_UANG_JALAN_DETAIL(id))
        return data.data as KomponenUangJalan
    },
    async create(payload: KomponenUangJalanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KOMPONEN_UANG_JALAN, payload)
        return data.data as KomponenUangJalan
    },
    async update(id: string, payload: Partial<KomponenUangJalanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.KOMPONEN_UANG_JALAN_DETAIL(id), payload)
        return data.data as KomponenUangJalan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KOMPONEN_UANG_JALAN_DETAIL(id))
    },
}
