import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface ParameterBok {
    id_parameter_bok: string
    id_perusahaan: string
    id_jenis_kendaraan: string
    id_jenis_bbm: string
    nama_jenis: string | null
    nama_bbm: string | null
    konsumsi_km_per_liter: number
    biaya_ban_per_km: number
    biaya_servis_per_km: number
    biaya_tetap_bulanan: number
    utilisasi_km_per_bulan: number
    margin_persen: number
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
}

export interface ParameterBokPayload {
    id_jenis_kendaraan: string
    id_jenis_bbm: string
    konsumsi_km_per_liter: number
    biaya_ban_per_km?: number | null
    biaya_servis_per_km?: number | null
    biaya_tetap_bulanan?: number | null
    utilisasi_km_per_bulan: number
    margin_persen?: number | null
    keterangan?: string | null
    aktif?: boolean
}

export const parameterBokService = {
    async list(page = 1, limit = 10) {
        const { data } = await axios.get(API_ENDPOINTS.PARAMETER_BOK, { params: { page, limit } })
        return data as { data: ParameterBok[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PARAMETER_BOK_DETAIL(id))
        return data.data as ParameterBok
    },
    async create(payload: ParameterBokPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PARAMETER_BOK, payload)
        return data.data as ParameterBok
    },
    async update(id: string, payload: Partial<ParameterBokPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.PARAMETER_BOK_DETAIL(id), payload)
        return data.data as ParameterBok
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PARAMETER_BOK_DETAIL(id))
    },
}
