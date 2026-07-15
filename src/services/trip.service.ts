import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Trip {
    id_trip: string
    id_jadwal: string
    waktu_checkin?: string
    waktu_checkout?: string
    status: 'belum_mulai' | 'berjalan' | 'selesai' | 'dibatalkan'
    catatan?: string
}

export interface StatusTrip {
    id_status: string
    status: string
    keterangan?: string
    latitude?: number
    longitude?: number
    dibuat_pada: string
}

export const tripService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP, { params: { page, limit: 15 } })
        return data as { data: Trip[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP_DETAIL(id))
        return data.data as Trip
    },
    async getStatus(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP_STATUS(id))
        return data.data as StatusTrip[]
    },
    async create(payload: { id_jadwal: string; catatan?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP, payload)
        return data.data as Trip
    },
    async checkin(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_CHECKIN(id))
        return data.data as Trip
    },
    async checkout(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_CHECKOUT(id))
        return data.data as Trip
    },
    async batalkan(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_BATALKAN(id))
        return data.data as Trip
    },
}
