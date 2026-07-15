import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusTrip = 'belum_mulai' | 'berjalan' | 'selesai' | 'dibatalkan'

export interface LaporanTripRow {
    id_trip: string
    waktu_berangkat: string
    nama_proyek: string
    nama_klien: string
    nopol: string
    nama_supir: string
    status: StatusTrip
    jarak_tempuh_km: number | null
    total_biaya: number
}

export interface LaporanTripFilter {
    dari?: string
    sampai?: string
    id_klien?: string
    id_supir?: string
    id_armada?: string
}

export interface LaporanTripRingkasan {
    jumlah_trip: number
    total_biaya: number
}

function cleanParams(params: Record<string, string | number | undefined>) {
    const cleaned: Record<string, string | number> = {}
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            cleaned[key] = value
        }
    })
    return cleaned
}

export const laporanOperasionalService = {
    async listTrip(page = 1, limit = 10, filter: LaporanTripFilter = {}) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN_TRIP, {
            params: cleanParams({ page, limit, ...filter }),
        })
        return data as { data: LaporanTripRow[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async ringkasan(filter: LaporanTripFilter = {}) {
        const { data } = await axios.get(API_ENDPOINTS.LAPORAN_TRIP_RINGKASAN, {
            params: cleanParams({ ...filter }),
        })
        return data.data as LaporanTripRingkasan
    },
}
