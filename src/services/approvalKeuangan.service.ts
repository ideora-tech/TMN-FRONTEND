import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface ApproverKeuangan {
    id_approver: string
    tipe: 'jabatan' | 'pengguna'
    id_jabatan: string | null
    id_pengguna: string | null
    nama: string
}

export const approvalKeuanganService = {
    async list() {
        const { data } = await axios.get(API_ENDPOINTS.APPROVER_KEUANGAN)
        return data.data as ApproverKeuangan[]
    },
    async tambah(payload: { tipe: 'jabatan' | 'pengguna'; id_jabatan?: string; id_pengguna?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.APPROVER_KEUANGAN, payload)
        return data as { success: boolean; message: string }
    },
    async hapus(id: string) {
        await axios.delete(API_ENDPOINTS.APPROVER_KEUANGAN_DETAIL(id))
    },
    async getBatas() {
        const { data } = await axios.get(API_ENDPOINTS.PENGATURAN_APPROVAL)
        return (data.data as { batas: number }).batas
    },
    async setBatas(nilai: number) {
        const { data } = await axios.put(API_ENDPOINTS.PENGATURAN_APPROVAL, { batas: nilai })
        return (data.data as { batas: number }).batas
    },
}
