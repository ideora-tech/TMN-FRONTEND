import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface BiayaLain {
    id_biaya_lain: string
    nama_biaya: string
    nominal: number
}

export interface FotoLaporan {
    id_foto: string
    url_file: string
    keterangan: string | null
}

export interface LaporanPerjalanan {
    id_laporan: string
    id_trip: string
    biaya_bbm: number
    jarak_tempuh_km: number
    uang_jalan: number
    catatan_insiden: string | null
    biaya_lain: BiayaLain[]
    foto: FotoLaporan[]
}

export type LaporanPerjalananPayload = {
    biaya_bbm: number
    jarak_tempuh_km: number
    uang_jalan: number
    catatan_insiden?: string | null
    biaya_lain: { nama_biaya: string; nominal: number }[]
}

function buildFotoFormData(file: File, keterangan?: string): FormData {
    const fd = new FormData()
    fd.append('file', file)
    if (keterangan) fd.append('keterangan', keterangan)
    return fd
}

export const laporanPerjalananService = {
    async getByTrip(idTrip: string) {
        try {
            const { data } = await axios.get(API_ENDPOINTS.TRIP_LAPORAN_PERJALANAN(idTrip))
            return data.data as LaporanPerjalanan
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) return null
            throw err
        }
    },

    async create(idTrip: string, payload: LaporanPerjalananPayload) {
        const { data } = await axios.post(API_ENDPOINTS.TRIP_LAPORAN_PERJALANAN(idTrip), payload)
        return data.data as LaporanPerjalanan
    },

    async update(id: string, payload: LaporanPerjalananPayload) {
        const { data } = await axios.put(API_ENDPOINTS.LAPORAN_PERJALANAN_DETAIL(id), payload)
        return data.data as LaporanPerjalanan
    },

    async uploadFoto(id: string, file: File, keterangan?: string) {
        const { data } = await axios.post(API_ENDPOINTS.LAPORAN_PERJALANAN_FOTO(id), buildFotoFormData(file, keterangan))
        return data.data as FotoLaporan
    },

    async deleteFoto(id: string, idFoto: string) {
        await axios.delete(API_ENDPOINTS.LAPORAN_PERJALANAN_FOTO_DELETE(id, idFoto))
    },
}
