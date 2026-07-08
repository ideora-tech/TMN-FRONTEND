import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface IzinPeran {
    id_izin: string
    id_perusahaan: string
    kode_peran: string
    id_menu: string
    aksi: string
    diizinkan: boolean
}

export const izinPeranService = {
    async listByPeran(kode_peran: string) {
        const { data } = await axios.get(API_ENDPOINTS.IZIN_PERAN, { params: { kode_peran } })
        return data.data as IzinPeran[]
    },
    async bulkUpsert(kode_peran: string, permissions: Array<{ id_menu: string; aksi: string; diizinkan: boolean }>) {
        const { data } = await axios.post(API_ENDPOINTS.IZIN_PERAN_BULK, { kode_peran, permissions })
        return data.data
    },
    async update(id: string, payload: Partial<Pick<IzinPeran, 'diizinkan'>>) {
        const { data } = await axios.put(API_ENDPOINTS.IZIN_PERAN_DETAIL(id), payload)
        return data.data as IzinPeran
    },
}
