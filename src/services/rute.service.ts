import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Rute {
    id_rute: string
    id_perusahaan: string
    kode_rute: string
    nama_rute: string
    asal: string | null
    tujuan: string | null
    estimasi_jarak_km: number | null
    estimasi_durasi_menit: number | null
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
}

export interface RutePayload {
    kode_rute: string
    nama_rute: string
    asal?: string | null
    tujuan?: string | null
    estimasi_jarak_km?: number | null
    estimasi_durasi_menit?: number | null
    keterangan?: string | null
    aktif?: boolean
}

export const ruteService = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
        axios.get(API_ENDPOINTS.RUTE, { params }).then(r => r.data),

    get: (id: string): Promise<Rute> =>
        axios.get(API_ENDPOINTS.RUTE_DETAIL(id)).then(r => r.data?.data),

    create: (payload: RutePayload): Promise<Rute> =>
        axios.post(API_ENDPOINTS.RUTE, payload).then(r => r.data?.data),

    update: (id: string, payload: Partial<RutePayload>): Promise<Rute> =>
        axios.put(API_ENDPOINTS.RUTE_DETAIL(id), payload).then(r => r.data?.data),

    delete: (id: string): Promise<void> =>
        axios.delete(API_ENDPOINTS.RUTE_DETAIL(id)).then(() => undefined),
}