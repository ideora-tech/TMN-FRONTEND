import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Trip {
    id_trip: string
    id_jadwal: string
    id_proyek?: string
    kode_proyek?: string
    nama_proyek?: string
    nama_klien?: string
    rute?: string
    waktu_berangkat?: string
    supir_nama?: string
    armada_nopol?: string
    waktu_checkin?: string
    waktu_checkout?: string
    status: 'belum_mulai' | 'berjalan' | 'selesai' | 'dibatalkan'
    catatan?: string
    uang_jalan_alokasi?: number | null
    sumber?: 'internal' | 'vendor'
    vendor_nama?: string | null
    mekanisme?: 'unit_only' | 'unit_driver' | 'full' | null
    id_penugasan?: string | null
    titik_drop?: string[]
    sudah_difakturkan?: boolean
    punya_laporan?: boolean
    pengajuan_uang_jalan?: PengajuanUangJalanTrip | null
}

export interface RiwayatPengajuanUangJalan {
    status: string
    waktu: string | null
    oleh: string | null
    keterangan: string | null
}

export interface PengajuanUangJalanTrip {
    id_pengajuan: string
    nomor_pengajuan: string
    status: string
    nominal: number
    riwayat: RiwayatPengajuanUangJalan[]
    periode?: {
        dari: string
        sampai: string
        tarif_per_hari: number
        jumlah_hari: number
    } | null
}

export interface StatusTrip {
    id_status: string
    status: string
    keterangan?: string
    latitude?: number
    longitude?: number
    dibuat_oleh?: string | null
    dibuat_oleh_nama?: string | null
    dibuat_oleh_peran?: string | null
    dibuat_pada: string
}

export interface RingkasanProyekTrip {
    id_proyek: string
    kode_proyek: string | null
    nama_proyek: string
    nama_klien: string | null
    jumlah_trip: number
    aktivitas_terakhir: string | null
}

export const tripService = {
    async list(params: { page?: number; limit?: number; id_penugasan?: string; id_supir?: string; id_proyek?: string; search?: string; status?: string; sumber?: 'internal' | 'vendor'; tanggal_dari?: string; tanggal_sampai?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP, { params: { page: 1, limit: 15, ...params } })
        return data as { data: Trip[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async ringkasanProyek(params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.TRIP_RINGKASAN_PROYEK, { params: { page: 1, limit: 10, ...params } })
        return data as { data: RingkasanProyekTrip[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async mulai(payload: { id_penugasan: string; id_rute?: string | null; catatan?: string | null; uang_jalan_alokasi?: number | null }) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_MULAI, payload)
        return data.data as Trip
    },
    async updateUangJalan(id: string, alokasi: number | null) {
        const { data } = await axios.put(API_ENDPOINTS.TRIP_UANG_JALAN(id), { uang_jalan_alokasi: alokasi })
        return data.data as Trip
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
    async checkout(id: string, selesaikanPenugasan = false) {
        const { data } = await axios.post(
            API_ENDPOINTS.TRIP_CHECKOUT(id),
            selesaikanPenugasan ? { selesaikan_penugasan: true } : {},
        )
        return data.data as Trip
    },
    async batalkan(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_BATALKAN(id))
        return data.data as Trip
    },
    async updateTitikDrop(idTrip: string, titikDrop: string[]) {
        const { data } = await axios.put(API_ENDPOINTS.TRIP_TITIK_DROP(idTrip), { titik_drop: titikDrop })
        return data.data as { titik_drop: string[] }
    },
}
