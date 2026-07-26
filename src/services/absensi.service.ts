import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusAbsensi = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha'

export interface AbsensiHarianRow {
    id_karyawan: string
    nik: string
    nama: string
    sedang_cuti: boolean
    status: StatusAbsensi | null
    jam_masuk: string | null
    jam_pulang: string | null
    keterangan: string | null
}

export interface AbsensiEntry {
    id_karyawan: string
    status: StatusAbsensi | null
    jam_masuk?: string | null
    jam_pulang?: string | null
    keterangan?: string | null
}

export interface RekapAbsensiRow {
    id_karyawan: string
    nik: string
    nama: string
    hadir: number
    terlambat: number
    izin: number
    sakit: number
    alpha: number
    cuti: number
}

export const absensiService = {
    async harian(tanggal: string) {
        const { data } = await axios.get(API_ENDPOINTS.ABSENSI_HARIAN, { params: { tanggal } })
        return data.data as AbsensiHarianRow[]
    },
    async simpanHarian(tanggal: string, entries: AbsensiEntry[]) {
        const { data } = await axios.post(API_ENDPOINTS.ABSENSI_HARIAN, { tanggal, entries })
        return data.data as { tersimpan: number; dilewati: number }
    },
    async rekap(params: { bulan?: string; page?: number; limit?: number; search?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.ABSENSI_REKAP, { params: { page: 1, limit: 10, ...params } })
        return data as { data: RekapAbsensiRow[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
}
