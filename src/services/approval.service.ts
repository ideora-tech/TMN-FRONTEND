import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface ApprovalEventType {
    id_event_type: string
    kode: string
    nama: string
    mode_resolusi: 'pinned' | 'relatif'
    aktif: boolean
    dibuat_pada: string
}

export interface ApprovalConfigApprover {
    id_config: string
    id_event_type: string
    tipe: 'jabatan' | 'pengguna'
    id_jabatan: string | null
    id_pengguna: string | null
    nama: string | null
}

export interface ApprovalPengajuanSaya {
    id_approval: string
    id_event_type: string
    nama_event_type: string
    id_referensi: string
    nominal: number | null
    status: 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'
    alasan_ditolak: string | null
    nama_pengaju: string | null
    kode_event_type: string | null
    nomor_referensi: string | null
    keterangan_referensi: string | null
    pihak_referensi: string | null
    dibuat_pada: string
}

export interface ApprovalRiwayatSaya {
    id_approval: string
    id_referensi: string
    kode_event_type: string | null
    nama_event_type: string
    nomor_referensi: string | null
    keterangan_referensi: string | null
    pihak_referensi: string | null
    nama_pengaju: string | null
    nominal: number | null
    keputusan_saya: 'disetujui' | 'ditolak'
    catatan_saya: string | null
    diputuskan_pada: string
    status_pengajuan: 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'
    diajukan_pada: string
}

export const approvalService = {
    async listEventType() {
        const { data } = await axios.get(API_ENDPOINTS.APPROVAL_EVENT_TYPE)
        return data.data as ApprovalEventType[]
    },
    async createEventType(payload: { kode: string; nama: string; mode_resolusi: 'pinned' | 'relatif' }) {
        const { data } = await axios.post(API_ENDPOINTS.APPROVAL_EVENT_TYPE, payload)
        return data.data as ApprovalEventType
    },
    async updateEventType(id: string, payload: { nama?: string; mode_resolusi?: 'pinned' | 'relatif'; aktif?: boolean }) {
        const { data } = await axios.put(API_ENDPOINTS.APPROVAL_EVENT_TYPE_DETAIL(id), payload)
        return data.data as ApprovalEventType
    },
    async deleteEventType(id: string) {
        await axios.delete(API_ENDPOINTS.APPROVAL_EVENT_TYPE_DETAIL(id))
    },
    async listConfigApprover(idEventType: string) {
        const { data } = await axios.get(API_ENDPOINTS.APPROVAL_EVENT_TYPE_APPROVER(idEventType))
        return data.data as ApprovalConfigApprover[]
    },
    async tambahConfigApprover(idEventType: string, payload: { tipe: 'jabatan' | 'pengguna'; id_jabatan?: string; id_pengguna?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.APPROVAL_EVENT_TYPE_APPROVER(idEventType), payload)
        return data.data as { id_config: string }
    },
    async hapusConfigApprover(idEventType: string, idConfig: string) {
        await axios.delete(API_ENDPOINTS.APPROVAL_EVENT_TYPE_APPROVER_DETAIL(idEventType, idConfig))
    },
    async menungguSaya() {
        const { data } = await axios.get(API_ENDPOINTS.APPROVAL_MENUNGGU_SAYA)
        return data.data as ApprovalPengajuanSaya[]
    },
    async putuskan(idApproval: string, keputusan: 'setuju' | 'tolak', catatan?: string) {
        const { data } = await axios.patch(API_ENDPOINTS.APPROVAL_KEPUTUSAN(idApproval), { keputusan, catatan })
        return data.data
    },
    async riwayatSaya() {
        const { data } = await axios.get(API_ENDPOINTS.APPROVAL_RIWAYAT_SAYA)
        return data.data as ApprovalRiwayatSaya[]
    },
    async exportSaya() {
        const res = await axios.get(API_ENDPOINTS.APPROVAL_EXPORT_SAYA, { responseType: 'blob' })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `riwayat-persetujuan-saya-${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
