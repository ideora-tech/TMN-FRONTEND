import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PengajuanKeuanganInfo, StatusPengajuan } from './arusKas.service'

export type StatusKasbon = 'menunggu_approval' | 'menunggu_pencairan' | 'ditolak' | 'berjalan' | 'lunas'
export type SumberPembayaranKasbon = 'payroll' | 'manual'

export interface PembayaranKasbon {
    id_kasbon_pembayaran: string
    tanggal: string
    nominal: number
    sumber: SumberPembayaranKasbon
    id_periode: string | null
    nama_periode: string | null
    keterangan: string | null
    tercatat_pemasukan: boolean
    bisa_dihapus: boolean
}

export interface PerubahanCicilanKasbon {
    id_riwayat_cicilan: string
    waktu: string
    oleh: string | null
    cicilan_lama: number
    cicilan_baru: number
    mulai_potong_lama: string
    mulai_potong_baru: string
    alasan: string
}

export interface Kasbon {
    id_kasbon: string
    nomor_kasbon: string
    tanggal: string
    id_karyawan: string
    nama_karyawan: string | null
    nik: string | null
    nama_jabatan: string | null
    karyawan_aktif: boolean
    nominal: number
    cicilan_per_periode: number
    mulai_potong: string
    keperluan: string
    nama_bank: string | null
    nomor_rekening: string | null
    saldo_awal: boolean
    terbayar: number
    sisa: number
    sisa_potongan: number
    status: StatusKasbon
    id_pengajuan: string | null
    nomor_pengajuan: string | null
    status_pengajuan: StatusPengajuan | null
    alasan_ditolak: string | null
    tanggal_transfer: string | null
    bisa_diubah: boolean
    bisa_ubah_cicilan: boolean
    bisa_catat_pelunasan: boolean
    dibuat_pada: string
    diubah_pada: string | null
    pembayaran?: PembayaranKasbon[]
    perubahan_cicilan?: PerubahanCicilanKasbon[]
}

export type KasbonPayload = {
    id_karyawan: string
    tanggal: string
    nominal: number
    cicilan_per_periode: number
    mulai_potong: string
    keperluan: string
    nama_bank: string | null
    nomor_rekening: string | null
    saldo_awal: boolean
}

export type CicilanKasbonPayload = {
    cicilan_per_periode: number
    mulai_potong: string
    alasan: string
}

export type PelunasanKasbonPayload = {
    tanggal: string
    nominal: number
    keterangan: string | null
    catat_pemasukan: boolean
}

export type KasbonFilter = {
    search?: string
    status?: string
    id_karyawan?: string
}

export interface RingkasanKasbon {
    total_sisa: number
    jumlah_berjalan: number
    jumlah_karyawan: number
    jumlah_menunggu: number
}

export interface OpsiKaryawanKasbon {
    id_karyawan: string
    nama_karyawan: string
    nik: string | null
    nama_jabatan: string | null
    nama_bank: string | null
    nomor_rekening: string | null
    aktif: boolean
    sisa_kasbon: number
    jumlah_kasbon_berjalan: number
}

const paramFilter = (filter: KasbonFilter) => ({
    search: filter.search || undefined,
    status: filter.status || undefined,
    id_karyawan: filter.id_karyawan || undefined,
})

export const kasbonService = {
    async list(page = 1, limit = 10, filter: KasbonFilter = {}) {
        const { data } = await axios.get(API_ENDPOINTS.KASBON, { params: { page, limit, ...paramFilter(filter) } })
        return data as { data: Kasbon[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async ringkasan() {
        const { data } = await axios.get(API_ENDPOINTS.KASBON_RINGKASAN)
        return data.data as RingkasanKasbon
    },

    async opsiKaryawan() {
        const { data } = await axios.get(API_ENDPOINTS.KASBON_OPSI_KARYAWAN)
        return data.data as OpsiKaryawanKasbon[]
    },

    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KASBON_DETAIL(id))
        return data.data as Kasbon
    },

    async create(payload: KasbonPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KASBON, payload)
        return data.data as Kasbon
    },

    async update(id: string, payload: KasbonPayload) {
        const { data } = await axios.put(API_ENDPOINTS.KASBON_DETAIL(id), payload)
        return data.data as Kasbon
    },

    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.KASBON_DETAIL(id))
    },

    async riwayat(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KASBON_RIWAYAT(id))
        return data.data as PengajuanKeuanganInfo | null
    },

    async ubahCicilan(id: string, payload: CicilanKasbonPayload) {
        const { data } = await axios.patch(API_ENDPOINTS.KASBON_CICILAN(id), payload)
        return data.data as Kasbon
    },

    async catatPelunasan(id: string, payload: PelunasanKasbonPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KASBON_PELUNASAN(id), payload)
        return data.data as Kasbon
    },

    async hapusPelunasan(id: string, idPembayaran: string) {
        const { data } = await axios.delete(API_ENDPOINTS.KASBON_PELUNASAN_DETAIL(id, idPembayaran))
        return data.data as Kasbon
    },

    async exportExcel(filter: KasbonFilter = {}) {
        const res = await axios.get(API_ENDPOINTS.KASBON_EXPORT_EXCEL, { responseType: 'blob', params: paramFilter(filter) })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `kasbon-${dayjs().format('YYYY-MM-DD')}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
