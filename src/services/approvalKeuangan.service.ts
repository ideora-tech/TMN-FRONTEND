import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type PengaturanApprovalKeuangan = {
    batas: number
    wajib_approval_manual?: boolean
    batas_realisasi_mandiri?: number
}

export const approvalKeuanganService = {
    async getPengaturan() {
        const { data } = await axios.get(API_ENDPOINTS.PENGATURAN_APPROVAL)
        return data.data as PengaturanApprovalKeuangan
    },
    async setPengaturan(batas: number, wajibApprovalManual: boolean, batasRealisasiMandiri?: number) {
        const { data } = await axios.put(API_ENDPOINTS.PENGATURAN_APPROVAL, {
            batas,
            wajib_approval_manual: wajibApprovalManual,
            ...(batasRealisasiMandiri !== undefined ? { batas_realisasi_mandiri: batasRealisasiMandiri } : {}),
        })
        return data.data as PengaturanApprovalKeuangan
    },
}
