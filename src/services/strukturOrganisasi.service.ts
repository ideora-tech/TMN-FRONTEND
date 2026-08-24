import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KaryawanRingkas {
    id_karyawan: string
    nama_karyawan: string
}

export interface JabatanTreeNode {
    id_jabatan: string
    nama_jabatan: string
    id_departemen: string | null
    nama_departemen: string | null
    karyawan: KaryawanRingkas[]
    jumlah_karyawan: number
    children: JabatanTreeNode[]
}

export const strukturOrganisasiService = {
    async get() {
        const { data } = await axios.get(API_ENDPOINTS.JABATAN_STRUKTUR_ORGANISASI)
        return data.data as JabatanTreeNode[]
    },
}
