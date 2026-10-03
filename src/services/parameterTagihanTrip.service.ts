import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type KodeParameterTagihan = 'overnight' | 'add_drop' | 'cross_cluster' | 'cancellation'

export interface KomponenParameterTagihan {
    kode: KodeParameterTagihan
    label: string
    satuan: string | null
    jumlah: number
    tarif: number
    nominal: number
}

export interface ParameterTagihanTrip {
    id_trip: string
    status_trip: string
    berlaku: boolean
    mode: 'normal' | 'cancellation' | null
    terkunci: boolean
    bisa_diatur: boolean
    harga_deal: number | null
    harga_perkiraan: boolean
    tarif: Record<KodeParameterTagihan, number | null>
    nilai: {
        jumlah_overnight: number
        jumlah_add_drop: number
        cross_cluster: boolean
        cancellation: boolean
        keterangan: string | null
    }
    rincian: {
        cancellation: boolean
        harga_dasar: number | null
        komponen: KomponenParameterTagihan[]
        total_parameter: number
    }
    total_tagihan: number | null
    diubah_oleh: string | null
    diubah_pada: string | null
}

export interface SimpanParameterTagihanPayload {
    jumlah_overnight: number
    jumlah_add_drop: number
    cross_cluster: boolean
    cancellation: boolean
    keterangan: string | null
}

export const parameterTagihanTripService = {
    async detail(idTrip: string) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP_PARAMETER_TAGIHAN(idTrip))
        return data.data as ParameterTagihanTrip
    },
    async simpan(idTrip: string, payload: SimpanParameterTagihanPayload) {
        const { data } = await axios.put(API_ENDPOINTS.TRIP_PARAMETER_TAGIHAN(idTrip), payload)
        return data.data as ParameterTagihanTrip
    },
}
