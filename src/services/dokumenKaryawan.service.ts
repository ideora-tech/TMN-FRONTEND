import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface DokumenKaryawan {
    id_dokumen_karyawan: string
    id_karyawan: string
    jenis_dokumen: string
    nomor: string | null
    berlaku_sampai: string | null
    url_file: string | null
    karyawan_nama?: string | null
    karyawan_nik?: string | null
    dibuat_pada: string
}

type DokumenPayload = {
    jenis_dokumen: string
    nomor?: string | null
    berlaku_sampai?: string | null
    url_file?: string | null
}

function buildFormData(payload: DokumenPayload, file: File): FormData {
    const fd = new FormData()
    fd.append('jenis_dokumen', payload.jenis_dokumen)
    if (payload.nomor) fd.append('nomor', payload.nomor)
    if (payload.berlaku_sampai) fd.append('berlaku_sampai', payload.berlaku_sampai)
    fd.append('file', file)
    return fd
}

export const dokumenKaryawanService = {
    async listAll(params?: { page?: number; limit?: number; id_karyawan?: string; jenis_dokumen?: string; search?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.DOKUMEN_KARYAWAN, { params })
        return data as { data: DokumenKaryawan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async list(idKaryawan: string) {
        const { data } = await axios.get(API_ENDPOINTS.KARYAWAN_DOKUMEN(idKaryawan))
        return data.data as DokumenKaryawan[]
    },

    async create(idKaryawan: string, payload: DokumenPayload, file?: File | null) {
        const body = file ? buildFormData(payload, file) : payload
        const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_DOKUMEN(idKaryawan), body)
        return data.data as DokumenKaryawan
    },

    async update(idKaryawan: string, id: string, payload: Partial<DokumenPayload>, file?: File | null) {
        if (file) {
            const fd = buildFormData({ jenis_dokumen: payload.jenis_dokumen ?? '', ...payload }, file)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_DOKUMEN_DETAIL(idKaryawan, id), fd)
            return data.data as DokumenKaryawan
        }
        const { data } = await axios.put(API_ENDPOINTS.KARYAWAN_DOKUMEN_DETAIL(idKaryawan, id), payload)
        return data.data as DokumenKaryawan
    },

    async delete(idKaryawan: string, id: string) {
        await axios.delete(API_ENDPOINTS.KARYAWAN_DOKUMEN_DETAIL(idKaryawan, id))
    },
}
