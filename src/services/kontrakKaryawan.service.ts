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
    url_file: string | null
    aktif: boolean
}

export type KontrakKaryawanPayload = {
    jenis_kontrak: JenisKontrak
    nomor_kontrak?: string | null
    tanggal_mulai: string
    tanggal_selesai?: string | null
    keterangan?: string | null
}

function buildFormData(payload: Partial<KontrakKaryawanPayload>, file: File): FormData {
    const fd = new FormData()
    if (payload.jenis_kontrak) fd.append('jenis_kontrak', payload.jenis_kontrak)
    if (payload.nomor_kontrak) fd.append('nomor_kontrak', payload.nomor_kontrak)
    if (payload.tanggal_mulai) fd.append('tanggal_mulai', payload.tanggal_mulai)
    if (payload.tanggal_selesai) fd.append('tanggal_selesai', payload.tanggal_selesai)
    if (payload.keterangan) fd.append('keterangan', payload.keterangan)
    fd.append('file', file)
    return fd
}

export const kontrakKaryawanService = {
    async list(idKaryawan: string) {
        const { data } = await axios.get(API_ENDPOINTS.KARYAWAN_KONTRAK(idKaryawan))
        return data.data as KontrakKaryawan[]
    },
    async create(idKaryawan: string, payload: KontrakKaryawanPayload, file?: File | null) {
        const body = file ? buildFormData(payload, file) : payload
        const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_KONTRAK(idKaryawan), body)
        return data.data as KontrakKaryawan
    },
    async update(idKaryawan: string, id: string, payload: Partial<KontrakKaryawanPayload>, file?: File | null) {
        if (file) {
            const fd = buildFormData(payload, file)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_KONTRAK_DETAIL(idKaryawan, id), fd)
            return data.data as KontrakKaryawan
        }
        const { data } = await axios.put(API_ENDPOINTS.KARYAWAN_KONTRAK_DETAIL(idKaryawan, id), payload)
        return data.data as KontrakKaryawan
    },
    async delete(idKaryawan: string, id: string) {
        await axios.delete(API_ENDPOINTS.KARYAWAN_KONTRAK_DETAIL(idKaryawan, id))
    },
}
