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
}

export interface HasilBatchShift {
    sukses: number
    gagal: { id_supir: string; tanggal?: string; alasan: string }[]
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
    async update(id: string, payload: { id_shift: string }) {
        const { data } = await axios.put(API_ENDPOINTS.JADWAL_SHIFT_DETAIL(id), payload)
        return data.data as JadwalShift
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JADWAL_SHIFT_DETAIL(id))
    },
}
