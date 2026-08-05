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
    jarak_tempuh_km: number | null
    uang_jalan: number
    uang_tol: number
    catatan_insiden: string | null
    id_jenis_bbm: string | null
    jumlah_liter: number | null
    biaya_lain: BiayaLain[]
    foto: FotoLaporan[]
}

export type LaporanPerjalananPayload = {
    biaya_bbm: number
    jarak_tempuh_km: number
    uang_jalan: number
    uang_tol: number
    catatan_insiden?: string | null
    id_jenis_bbm?: string | null
    jumlah_liter?: number | null
    biaya_lain: { nama_biaya: string; nominal: number }[]
}

function buildLaporanFormData(payload: LaporanPerjalananPayload, files: File[]): FormData {
    const fd = new FormData()
    fd.append('biaya_bbm', String(payload.biaya_bbm))
    fd.append('jarak_tempuh_km', String(payload.jarak_tempuh_km))
    fd.append('uang_jalan', String(payload.uang_jalan))
    fd.append('uang_tol', String(payload.uang_tol))
    if (payload.catatan_insiden) fd.append('catatan_insiden', payload.catatan_insiden)
    if (payload.id_jenis_bbm) fd.append('id_jenis_bbm', payload.id_jenis_bbm)
    if (payload.jumlah_liter != null) fd.append('jumlah_liter', String(payload.jumlah_liter))
    payload.biaya_lain.forEach((b, i) => {
        fd.append(`biaya_lain[${i}][nama_biaya]`, b.nama_biaya)
        fd.append(`biaya_lain[${i}][nominal]`, String(b.nominal))
    })
    files.forEach(file => fd.append('foto[]', file))
    return fd
}

function buildFotoFormData(files: File[], keterangan?: string): FormData {
    const fd = new FormData()
    files.forEach(file => fd.append('foto[]', file))
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

    async create(idTrip: string, payload: LaporanPerjalananPayload, files: File[] = []) {
        const body = files.length > 0 ? buildLaporanFormData(payload, files) : payload
        const { data } = await axios.post(API_ENDPOINTS.TRIP_LAPORAN_PERJALANAN(idTrip), body)
        return data.data as LaporanPerjalanan
    },

    async update(id: string, payload: LaporanPerjalananPayload, files: File[] = []) {
        if (files.length > 0) {
            const fd = buildLaporanFormData(payload, files)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.LAPORAN_PERJALANAN_DETAIL(id), fd)
            return data.data as LaporanPerjalanan
        }
        const { data } = await axios.put(API_ENDPOINTS.LAPORAN_PERJALANAN_DETAIL(id), payload)
        return data.data as LaporanPerjalanan
    },

    async uploadFoto(id: string, files: File[], keterangan?: string) {
        const { data } = await axios.post(API_ENDPOINTS.LAPORAN_PERJALANAN_FOTO(id), buildFotoFormData(files, keterangan))
        return data.data as FotoLaporan[]
    },

    async deleteFoto(id: string, idFoto: string) {
        await axios.delete(API_ENDPOINTS.LAPORAN_PERJALANAN_FOTO_DELETE(id, idFoto))
    },
}
