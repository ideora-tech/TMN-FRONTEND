import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type NotifikasiTipe = 'alert_dokumen' | 'reminder_trip' | 'info'

export interface Notifikasi {
    id_notifikasi: string
    id_perusahaan: string
    id_pengguna: string | null
    judul: string
    isi: string
    tipe: NotifikasiTipe
    referensi_id: string | null
    referensi_tipe: string | null
    dibaca: boolean
    dibaca_pada: string | null
    dibuat_pada: string
}

export const notifikasiService = {
    list: (params?: Record<string, unknown>) =>
        axios.get(API_ENDPOINTS.NOTIFIKASI, { params }).then(r => r.data),

    unreadCount: (): Promise<number> =>
        axios.get(`${API_ENDPOINTS.NOTIFIKASI}/unread-count`).then(r => r.data?.data?.count ?? 0),

    markRead: (id: string): Promise<Notifikasi> =>
        axios.put(API_ENDPOINTS.NOTIFIKASI_BACA(id)).then(r => r.data?.data),

    markAllRead: (): Promise<number> =>
        axios.put(API_ENDPOINTS.NOTIFIKASI_BACA_SEMUA).then(r => r.data?.data?.updated ?? 0),
}
