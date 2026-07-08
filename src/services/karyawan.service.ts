import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Karyawan {
    id_karyawan: string
    id_perusahaan: string
    nik: string
    nama_karyawan: string
    email: string | null
    telepon: string | null
    jenis_kelamin: 'L' | 'P' | null
    tanggal_lahir: string | null
    tanggal_masuk: string | null
    status_kepegawaian: 'tetap' | 'kontrak' | 'magang' | null
    gaji_pokok: number
    aktif: boolean
    jabatan?: { id_jabatan: string; nama_jabatan: string }
    lokasi?: { id_lokasi: string; nama_lokasi: string }
}

export const karyawanService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.KARYAWAN, { params: { page, limit: 15 } })
        return data as { data: Karyawan[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KARYAWAN_DETAIL(id))
        return data.data as Karyawan
    },
    async create(payload: Omit<Karyawan, 'id_karyawan' | 'id_perusahaan' | 'jabatan' | 'lokasi'>) {
        const { data } = await axios.post(API_ENDPOINTS.KARYAWAN, payload)
        return data.data as Karyawan
    },
    async update(id: string, payload: Partial<Omit<Karyawan, 'id_karyawan' | 'jabatan' | 'lokasi'>>) {
        const { data } = await axios.put(API_ENDPOINTS.KARYAWAN_DETAIL(id), payload)
        return data.data as Karyawan
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KARYAWAN_DETAIL(id))
    },
}
