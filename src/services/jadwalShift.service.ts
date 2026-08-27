import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface JadwalShift {
    id_jadwal_shift: string
    id_proyek: string
    id_shift: string
    id_supir: string
    tanggal: string
    shift_nama: string
    jam_mulai: string
    jam_selesai: string
    status_trip?: 'berjalan' | 'selesai' | null
    id_trip?: string | null
    trips?: { status: 'berjalan' | 'selesai'; id_trip: string }[]
    id_supir_pengganti?: string | null
    nama_supir_pengganti?: string | null
    id_armada_override?: string | null
    nopol_override?: string | null
    titik_drop_override: string[]
}

export interface HasilBatchShift {
    sukses: number
    gagal: { id_supir: string; tanggal?: string; alasan: string }[]
    peringatan?: string[]
}

export const jadwalShiftService = {
    async list(idProyek: string, dari: string, sampai: string) {
        const { data } = await axios.get(API_ENDPOINTS.JADWAL_SHIFT, { params: { id_proyek: idProyek, dari, sampai } })
        return data.data as JadwalShift[]
    },
    async create(payload: { id_proyek: string; id_shift: string; tanggal: string; tanggal_sampai?: string | null; supir: string[] }) {
        const { data } = await axios.post(API_ENDPOINTS.JADWAL_SHIFT, payload)
        return data.data as HasilBatchShift
    },
    async update(id: string, payload: {
        id_shift: string
        id_supir_pengganti?: string | null
        id_armada_override?: string | null
        titik_drop_override?: string[] | null
    }) {
        const { data } = await axios.put(API_ENDPOINTS.JADWAL_SHIFT_DETAIL(id), payload)
        return data.data as JadwalShift
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JADWAL_SHIFT_DETAIL(id))
    },
    async importExcel(idProyek: string, file: File) {
        const formData = new FormData()
        formData.append('id_proyek', idProyek)
        formData.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.JADWAL_SHIFT_IMPORT, formData)
        return data.data as {
            sukses: number
            ditimpa: { baris: number; no_sim: string; tanggal: string; shift_lama: string; shift_baru: string }[]
            gagal: { baris: number; no_sim: string; alasan: string }[]
            peringatan?: string[]
        }
    },
    async downloadTemplate(idProyek: string, dari: string, sampai: string) {
        const res = await axios.get(API_ENDPOINTS.JADWAL_SHIFT_IMPORT_TEMPLATE, {
            responseType: 'blob',
            params: { id_proyek: idProyek, dari, sampai },
        })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `template-jadwal-shift-${dari}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
