import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface LokasiKantor {
    id_lokasi: string
    id_perusahaan: string
    kode_lokasi: string
    nama_lokasi: string
    alamat: string | null
    kota: string | null
    latitude: number | null
    longitude: number | null
    radius: number
    aktif: boolean
}

export const lokasiKantorService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.LOKASI_KANTOR, { params: { page, limit: 15 } })
        return data as { data: LokasiKantor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.LOKASI_KANTOR_DETAIL(id))
        return data.data as LokasiKantor
    },
    async create(payload: Omit<LokasiKantor, 'id_lokasi' | 'id_perusahaan'>) {
        const { data } = await axios.post(API_ENDPOINTS.LOKASI_KANTOR, payload)
        return data.data as LokasiKantor
    },
    async update(id: string, payload: Partial<Omit<LokasiKantor, 'id_lokasi'>>) {
        const { data } = await axios.put(API_ENDPOINTS.LOKASI_KANTOR_DETAIL(id), payload)
        return data.data as LokasiKantor
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.LOKASI_KANTOR_DETAIL(id))
    },
}
