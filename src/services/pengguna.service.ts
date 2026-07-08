import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Pengguna {
    id_pengguna: string
    id_perusahaan: string | null
    id_karyawan: string | null
    username: string
    email: string
    kode_peran: string | null
    aktif: boolean
    harus_ganti_password: boolean
    login_terakhir: string | null
}

export const penggunaService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.PENGGUNA, { params: { page, limit: 15 } })
        return data as { data: Pengguna[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENGGUNA_DETAIL(id))
        return data.data as Pengguna
    },
    async create(payload: Omit<Pengguna, 'id_pengguna' | 'login_terakhir'> & { kata_sandi: string }) {
        const { kata_sandi, ...rest } = payload
        const { data } = await axios.post(API_ENDPOINTS.PENGGUNA, { ...rest, password: kata_sandi })
        return data.data as Pengguna
    },
    async update(id: string, payload: Partial<Omit<Pengguna, 'id_pengguna'>>) {
        const { data } = await axios.put(API_ENDPOINTS.PENGGUNA_DETAIL(id), payload)
        return data.data as Pengguna
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PENGGUNA_DETAIL(id))
    },
}
