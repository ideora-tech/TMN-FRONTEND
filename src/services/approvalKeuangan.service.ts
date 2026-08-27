import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export const approvalKeuanganService = {
    async getBatas() {
        const { data } = await axios.get(API_ENDPOINTS.PENGATURAN_APPROVAL)
        return (data.data as { batas: number }).batas
    },
    async setBatas(nilai: number) {
        const { data } = await axios.put(API_ENDPOINTS.PENGATURAN_APPROVAL, { batas: nilai })
        return (data.data as { batas: number }).batas
    },
}
