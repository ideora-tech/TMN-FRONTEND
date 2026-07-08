import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface LogError {
    id_log_error: string
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical'
    pesan: string
    stack_trace: string | null
    metode_http: string | null
    jalur: string | null
    kode_status: number | null
    id_pengguna: string | null
    dibuat_pada: string
}

export const logErrorService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.LOG_ERROR, { params: { page, limit: 20 } })
        return data as { data: LogError[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.LOG_ERROR_DETAIL(id))
        return data.data as LogError
    },
}
