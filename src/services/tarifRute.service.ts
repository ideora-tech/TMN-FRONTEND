import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface TarifRute {
    id_tarif_rute: string
    id_perusahaan: string
    id_rute: string
    id_jenis_kendaraan: string
    id_klien: string | null
    kode_rute: string | null
    nama_rute: string | null
    asal: string | null
    tujuan: string | null
    nama_jenis: string | null
    nama_klien: string | null
    harga: number
    estimasi_tol: number | null
    estimasi_bbm: number | null
    estimasi_uang_jalan: number | null
    estimasi_biaya_lain: number | null
    tanggal_mulai: string
    tanggal_berakhir: string | null
    keterangan: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
}

export interface TarifRutePayload {
    id_rute: string
    id_jenis_kendaraan: string
    id_klien?: string | null
    harga: number
    estimasi_tol?: number | null
    estimasi_bbm?: number | null
    estimasi_uang_jalan?: number | null
    estimasi_biaya_lain?: number | null
    tanggal_mulai: string
    tanggal_berakhir?: string | null
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

export const tarifRuteService = {
    list: (params?: {
        page?: number
        limit?: number
        search?: string
        id_rute?: string
        id_jenis_kendaraan?: string
        id_klien?: string
        berlaku?: '1'
    }) => axios.get(API_ENDPOINTS.TARIF_RUTE, { params }).then(r => r.data),

    get: (id: string): Promise<TarifRute> =>
        axios.get(API_ENDPOINTS.TARIF_RUTE_DETAIL(id)).then(r => r.data?.data),

    create: (payload: TarifRutePayload): Promise<TarifRute> =>
        axios.post(API_ENDPOINTS.TARIF_RUTE, payload).then(r => r.data?.data),

    update: (id: string, payload: Partial<TarifRutePayload>): Promise<TarifRute> =>
        axios.put(API_ENDPOINTS.TARIF_RUTE_DETAIL(id), payload).then(r => r.data?.data),

    delete: (id: string): Promise<void> =>
        axios.delete(API_ENDPOINTS.TARIF_RUTE_DETAIL(id)).then(() => undefined),

    resolusi: (params: {
        id_rute: string
        id_jenis_kendaraan: string
        id_klien?: string
        tanggal?: string
    }): Promise<TarifRute | null> =>
        axios.get(API_ENDPOINTS.TARIF_RUTE_RESOLUSI, { params }).then(r => r.data?.data ?? null),

    estimasiBok: (params: {
        id_rute: string
        id_jenis_kendaraan: string
        estimasi_tol?: number
    }): Promise<EstimasiBok | null> =>
        axios.get(API_ENDPOINTS.TARIF_RUTE_ESTIMASI_BOK, { params }).then(r => r.data?.data ?? null),
}
