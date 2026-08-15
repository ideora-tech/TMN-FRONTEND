import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface TripSiapTagih {
    id_trip: string
    tanggal: string
    id_rute: string | null
    rute: string | null
    nopol: string | null
    supir_nama: string | null
    sumber: 'internal' | 'vendor'
    jarak_tempuh_km: number | null
    tarif: { id_tarif_rute: string; harga: number } | null
    bisa_ditagih: boolean
}

export interface BuatFakturPayload {
    id_proyek: string
    trip_ids: string[]
    tanggal_faktur: string
    jatuh_tempo?: string | null
    keterangan?: string | null
}

export const penagihanTripService = {
    async list(idProyek: string, dari?: string, sampai?: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENAGIHAN_TRIP, {
            params: { id_proyek: idProyek, dari: dari || undefined, sampai: sampai || undefined },
        })
        return data.data as TripSiapTagih[]
    },
    async buatFaktur(payload: BuatFakturPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PENAGIHAN_TRIP_FAKTUR, payload)
        return data.data as { id_faktur: string }
    },
}
