import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface PerusahaanGrup {
    id_perusahaan_grup: string
    id_perusahaan: string
    singkatan: string
    nama_lengkap: string | null
    aktif: boolean
}

export const perusahaanGrupService = {
    async list(page = 1, limit = 15, search?: string, aktif?: '' | '1' | '0') {
        const { data } = await axios.get(API_ENDPOINTS.PERUSAHAAN_GRUP, { params: { page, limit, search: search || undefined, aktif: aktif || undefined } })
        return data as { data: PerusahaanGrup[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async opsiAktif() {
        const { data } = await axios.get(API_ENDPOINTS.PERUSAHAAN_GRUP_OPSI_AKTIF)
        return data.data as PerusahaanGrup[]
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERUSAHAAN_GRUP_DETAIL(id))
        return data.data as PerusahaanGrup
    },
    async create(payload: { singkatan: string; nama_lengkap: string | null; aktif: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.PERUSAHAAN_GRUP, payload)
        return data.data as PerusahaanGrup
    },
    async update(id: string, payload: Partial<{ singkatan: string; nama_lengkap: string | null; aktif: boolean }>) {
        const { data } = await axios.put(API_ENDPOINTS.PERUSAHAAN_GRUP_DETAIL(id), payload)
        return data.data as PerusahaanGrup
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PERUSAHAAN_GRUP_DETAIL(id))
    },
}

export const labelPerusahaanGrup = (g: Pick<PerusahaanGrup, 'singkatan' | 'nama_lengkap'>) =>
    g.nama_lengkap ? `${g.singkatan} — ${g.nama_lengkap}` : g.singkatan
