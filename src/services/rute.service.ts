import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Rute {
    id_rute: string
    id_perusahaan: string
    kode_rute: string
    nama_rute: string
    asal: string | null
    tujuan: string | null
    id_lokasi_asal: string | null
    id_lokasi_tujuan: string | null
    estimasi_jarak_km: number | null
    estimasi_durasi_menit: number | null
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
}

export function labelRute(r: Rute): string {
    const arah = r.asal && r.tujuan ? `${r.asal} → ${r.tujuan}` : null
    const jarak = r.estimasi_jarak_km ? `${r.estimasi_jarak_km} km` : null
    const keterangan = [arah, jarak].filter(Boolean).join(', ')
    return keterangan ? `${r.nama_rute} — ${keterangan}` : r.nama_rute
}

export interface RutePayload {
    kode_rute?: string
    nama_rute: string
    id_lokasi_asal?: string | null
    id_lokasi_tujuan?: string | null
    estimasi_jarak_km?: number | null
    estimasi_durasi_menit?: number | null
    keterangan?: string | null
    aktif?: boolean
}

export interface EstimasiBok {
    bok_per_km: number
    harga_pokok: number
    saran_harga: number
    margin_persen_default: number
    komponen: {
        biaya_tetap_per_km: number
        biaya_bbm_per_km: number
        biaya_ban_per_km: number
        biaya_servis_per_km: number
        harga_bbm_per_liter: number
        konsumsi_km_per_liter: number
        utilisasi_km_per_bulan: number
        jarak_km: number
        estimasi_tol: number | null
    }
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

    estimasiBok: (params: {
        id_rute: string
        id_jenis_kendaraan: string
        estimasi_tol?: number
    }): Promise<EstimasiBok | null> =>
        axios.get(API_ENDPOINTS.RUTE_ESTIMASI_BOK, { params }).then(r => r.data?.data ?? null),
}