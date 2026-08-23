import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface SupirProyek {
    id_supir_proyek: string
    id_proyek: string
    id_supir: string
    nama: string
    no_sim: string | null
    telepon: string | null
}

export interface HasilTambahBatchSupirProyek {
    sukses: number
    gagal: { id_supir: string; alasan: string }[]
}

export const supirProyekService = {
    async list(idProyek: string) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_PROYEK, { params: { id_proyek: idProyek } })
        return data.data as SupirProyek[]
    },
    async tambahBatch(payload: { id_proyek: string; supir: string[] }) {
        const { data } = await axios.post(API_ENDPOINTS.SUPIR_PROYEK, payload)
        return data.data as HasilTambahBatchSupirProyek
    },
    async hapus(id: string) {
        await axios.delete(API_ENDPOINTS.SUPIR_PROYEK_DETAIL(id))
    },
}
