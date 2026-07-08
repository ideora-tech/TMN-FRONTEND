import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type JenisExit = 'resign' | 'pensiun' | 'phk' | 'meninggal' | 'kontrak_habis'

export interface KaryawanExit {
    id_exit: string
    id_perusahaan: string
    id_karyawan: string
    jenis_exit: JenisExit
    tanggal_efektif: string
    alasan: string | null
    dapat_direkrut_kembali: boolean
    dibuat_pada: string
    diubah_pada: string
}

export const karyawanExitService = {
    async create(payload: {
        id_karyawan: string
        jenis_exit: JenisExit
        tanggal_efektif: string
        alasan?: string | null
        dapat_direkrut_kembali?: boolean
    }) {
        const { data } = await axios.post(API_ENDPOINTS.KARYAWAN_EXIT, payload)
        return data.data as KaryawanExit
    },
}
