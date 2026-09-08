import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type PengaturanApprovalKeuangan = {
    batas: number
    wajib_approval_manual?: boolean
}

export const approvalKeuanganService = {
    async getPengaturan() {
        const { data } = await axios.get(API_ENDPOINTS.PENGATURAN_APPROVAL)
        return data.data as PengaturanApprovalKeuangan
    },
    async setPengaturan(batas: number, wajibApprovalManual: boolean) {
        const { data } = await axios.put(API_ENDPOINTS.PENGATURAN_APPROVAL, {
            batas,
            wajib_approval_manual: wajibApprovalManual,
        })
        return data.data as PengaturanApprovalKeuangan
    },
}
