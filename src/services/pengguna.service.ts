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

export interface OpsiSupirAkun {
    id_supir: string
    nama: string
    no_sim: string | null
    telepon: string | null
    status: string
    nama_karyawan: string | null
    id_pengguna: string | null
    username_pengguna: string | null
}

export interface OpsiSupirVendorAkun {
    id_supir_vendor: string
    nama: string
    telepon: string | null
    aktif: boolean
    nama_vendor: string
    id_pengguna: string | null
    username_pengguna: string | null
}

export interface OpsiTautanSupir {
    supir: OpsiSupirAkun[]
    supir_vendor: OpsiSupirVendorAkun[]
}

export interface TautanSupirPayload {
    id_supir?: string | null
    id_supir_vendor?: string | null
}

export const penggunaService = {
    async opsiSupir(): Promise<OpsiTautanSupir> {
        const { data } = await axios.get(API_ENDPOINTS.PENGGUNA_OPSI_SUPIR)
        const hasil = data.data as { supir: OpsiSupirAkun[]; supir_vendor: (Omit<OpsiSupirVendorAkun, 'aktif'> & { aktif: number | boolean })[] }
        return {
            supir: hasil.supir,
            supir_vendor: hasil.supir_vendor.map(v => ({ ...v, aktif: v.aktif === 1 || v.aktif === true })),
        }
    },
    async list(page = 1, limit = 15, search?: string, aktif?: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENGGUNA, { params: { page, limit, search: search || undefined, aktif: aktif || undefined } })
        return data as { data: Pengguna[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENGGUNA_DETAIL(id))
        return data.data as Pengguna
    },
    async create(payload: Omit<Pengguna, 'id_pengguna' | 'login_terakhir'> & { kata_sandi: string } & TautanSupirPayload) {
        const { kata_sandi, ...rest } = payload
        const { data } = await axios.post(API_ENDPOINTS.PENGGUNA, { ...rest, password: kata_sandi })
        return data.data as Pengguna
    },
    async update(id: string, payload: Partial<Omit<Pengguna, 'id_pengguna'>> & { password?: string } & TautanSupirPayload) {
        const { data } = await axios.put(API_ENDPOINTS.PENGGUNA_DETAIL(id), payload)
        return data.data as Pengguna
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PENGGUNA_DETAIL(id))
    },
}
