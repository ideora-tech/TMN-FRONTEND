import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface JenisCuti {
    id_jenis_cuti: string
    nama_jenis: string
    mengurangi_saldo: boolean
    aktif: boolean
    keterangan: string | null
}

export type StatusPengajuanCuti = 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'

export interface PengajuanCuti {
    id_pengajuan: string
    id_karyawan: string | null
    id_supir: string | null
    tipe_orang: 'karyawan' | 'supir'
    nama_orang: string | null
    id_jenis_cuti: string
    nama_jenis: string | null
    mengurangi_saldo: boolean
    tanggal_mulai: string
    tanggal_selesai: string
    jumlah_hari: number
    alasan: string | null
    status: StatusPengajuanCuti
    diproses_pada: string | null
    catatan_proses: string | null
    dibuat_pada: string
}

export interface SaldoCutiInfo {
    tahun: number
    jatah: number
    penyesuaian: number
    terpakai: number
    sisa: number
    riwayat: { id_saldo_cuti: string; tipe: string; jumlah_hari: number; keterangan: string | null; dibuat_pada: string }[]
}

export interface RekapSaldoRow {
    tipe: 'karyawan' | 'supir'
    id: string
    nama: string
    jatah: number
    penyesuaian: number
    terpakai: number
    sisa: number
}

export interface CutiAktif {
    id_karyawan: string | null
    id_supir: string | null
    tanggal_mulai: string
    tanggal_selesai: string
}

export const cutiService = {
    async listJenis(params: { page?: number; limit?: number; search?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.JENIS_CUTI, { params: { page: 1, limit: 10, ...params } })
        return data as { data: JenisCuti[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async createJenis(payload: { nama_jenis: string; mengurangi_saldo?: boolean; aktif?: boolean; keterangan?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.JENIS_CUTI, payload)
        return data.data as JenisCuti
    },
    async updateJenis(id: string, payload: Partial<{ nama_jenis: string; mengurangi_saldo: boolean; aktif: boolean; keterangan: string | null }>) {
        const { data } = await axios.put(API_ENDPOINTS.JENIS_CUTI_DETAIL(id), payload)
        return data.data as JenisCuti
    },
    async deleteJenis(id: string) {
        await axios.delete(API_ENDPOINTS.JENIS_CUTI_DETAIL(id))
    },

    async listPengajuan(params: { page?: number; limit?: number; status?: string; search?: string; tanggal_dari?: string; tanggal_sampai?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.PENGAJUAN_CUTI, { params: { page: 1, limit: 10, ...params } })
        return data as { data: PengajuanCuti[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async createPengajuan(payload: { id_karyawan?: string | null; id_supir?: string | null; id_jenis_cuti: string; tanggal_mulai: string; tanggal_selesai: string; alasan?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.PENGAJUAN_CUTI, payload)
        return data.data as PengajuanCuti
    },
    async setujui(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PENGAJUAN_CUTI_SETUJUI(id))
        return data.data as PengajuanCuti
    },
    async tolak(id: string, catatan?: string | null) {
        const { data } = await axios.post(API_ENDPOINTS.PENGAJUAN_CUTI_TOLAK(id), catatan ? { catatan } : {})
        return data.data as PengajuanCuti
    },
    async batalkan(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PENGAJUAN_CUTI_BATALKAN(id))
        return data.data as PengajuanCuti
    },
    async cutiAktif(tanggal?: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENGAJUAN_CUTI_AKTIF, { params: { tanggal } })
        return data.data as CutiAktif[]
    },

    async saldo(params: { id_karyawan?: string; id_supir?: string; tahun?: number }) {
        const { data } = await axios.get(API_ENDPOINTS.SALDO_CUTI, { params })
        return data.data as SaldoCutiInfo
    },
    async rekapSaldo(params: { tahun?: number; page?: number; limit?: number; search?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.SALDO_CUTI_REKAP, { params: { page: 1, limit: 10, ...params } })
        return data as { data: RekapSaldoRow[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async penyesuaian(payload: { id_karyawan?: string | null; id_supir?: string | null; tahun: number; jumlah_hari: number; keterangan?: string | null }) {
        const { data } = await axios.post(API_ENDPOINTS.SALDO_CUTI_PENYESUAIAN, payload)
        return data.data
    },
}
