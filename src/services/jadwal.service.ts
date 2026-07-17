import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Jadwal {
    id_jadwal: string
    id_penugasan: string
    id_rute: string | null
    waktu_berangkat: string | null
    tgl_keberangkatan: string | null
    rute: string | null
    estimasi_tiba: string | null
    status: 'terjadwal' | 'berjalan' | 'selesai' | 'dibatalkan'
    dibuat_pada: string
}

export const jadwalService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL, { params: { page, limit } })
        return data as { data: Jadwal[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async listBySupir(idSupir: string, page = 1, limit = 50) {
        const { data } = await axios.get(`/api/proxy/jadwal/supir/${idSupir}`, { params: { page, limit } })
        return data as { data: Jadwal[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async listByPenugasan(idPenugasan: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL, {
            params: { id_penugasan: idPenugasan, page, limit },
        })
        return data as { data: Jadwal[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL_DETAIL(id))
        return data.data as Jadwal
    },

    async create(payload: {
        id_penugasan: string
        waktu_berangkat?: string | null
        id_rute?: string | null
        estimasi_tiba?: string | null
    }) {
        const { data } = await axios.post(API_ENDPOINTS.JADWAL, payload)
        return data.data as Jadwal
    },

    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JADWAL_DETAIL(id))
    },
}
