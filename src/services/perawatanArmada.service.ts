import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface PerawatanArmada {
    id_perawatan: string
    id_armada: string
    tanggal: string
    jenis_perawatan: string
    biaya: number
    keterangan: string | null
    dibuat_pada: string
    diubah_pada: string
}

export const perawatanArmadaService = {
    async list(idArmada: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada))
        return data.data as PerawatanArmada[]
    },
    async create(idArmada: string, payload: { tanggal: string; jenis_perawatan: string; biaya: number; keterangan?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada), payload)
        return data.data as PerawatanArmada
    },
    async update(idArmada: string, id: string, payload: Partial<{ tanggal: string; jenis_perawatan: string; biaya: number; keterangan: string | null }>) {
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id), payload)
        return data.data as PerawatanArmada
    },
    async delete(idArmada: string, id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id))
    },
}
