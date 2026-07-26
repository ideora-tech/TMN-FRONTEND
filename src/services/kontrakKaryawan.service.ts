import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type JenisKontrak = 'pkwt' | 'pkwtt' | 'harian' | 'magang' | 'probation'

export interface KontrakKaryawan {
    id_kontrak: string
    id_karyawan: string
    jenis_kontrak: JenisKontrak
    nomor_kontrak: string | null
    tanggal_mulai: string
    tanggal_selesai: string | null
    keterangan: string | null
    aktif: boolean
}

export type KontrakKaryawanPayload = {
    jenis_kontrak: JenisKontrak
    nomor_kontrak?: string | null
    tanggal_mulai: string
    tanggal_selesai?: string | null
    keterangan?: string | null
}

export const kontrakKaryawanService = {
    async list(idKaryawan: string) {
        const { data } = await axios.get(API_ENDPOINTS.KARYAWAN_KONTRAK(idKaryawan))
        return data.data as KontrakKaryawan[]
    },
    async create(idKaryawan: string, payload: KontrakKaryawanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_KONTRAK(idKaryawan), payload)
        return data.data as KontrakKaryawan
    },
    async update(idKaryawan: string, id: string, payload: Partial<KontrakKaryawanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.KARYAWAN_KONTRAK_DETAIL(idKaryawan, id), payload)
        return data.data as KontrakKaryawan
    },
    async delete(idKaryawan: string, id: string) {
        await axios.delete(API_ENDPOINTS.KARYAWAN_KONTRAK_DETAIL(idKaryawan, id))
    },
}
