import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { unduhDariApi } from '@/utils/unduhBerkas'
import type { PengajuanKeuanganInfo, StatusPengajuan } from './arusKas.service'

export type StatusPengisianKasKecil = 'menunggu_approval' | 'menunggu_transfer' | 'ditolak' | 'selesai'
export type ArahKasKecil = 'masuk' | 'keluar'
export type JenisTransaksiKasKecil = 'pengisian' | 'saldo_awal' | 'pengeluaran'

export interface PengisianKasKecil {
    id_pengisian: string
    nomor_pengisian: string
    tanggal: string
    nominal: number
    keterangan: string
    id_rekening_perusahaan: string | null
    nama_bank: string | null
    nomor_rekening: string | null
    atas_nama_rekening: string | null
    status: StatusPengisianKasKecil
    id_pengajuan: string | null
    nomor_pengajuan: string | null
    status_pengajuan: StatusPengajuan | null
    alasan_ditolak: string | null
    tanggal_transfer: string | null
    url_bukti_transfer: string | null
    dibuat_oleh_nama: string | null
    bisa_diubah: boolean
    dibuat_pada: string
    diubah_pada: string | null
}

export interface TransaksiKasKecil {
    id_transaksi: string
    nomor_transaksi: string
    tanggal: string
    arah: ArahKasKecil
    jenis: JenisTransaksiKasKecil
    label_jenis: string
    kategori: string | null
    label_kategori: string | null
    nominal: number
    penerima: string | null
    keterangan: string
    url_bukti: string | null
    id_pengisian: string | null
    nomor_pengisian: string | null
    saldo: number | null
    dicatat_oleh: string | null
    bisa_diubah: boolean
    dibuat_pada: string
}

export interface OpsiKategoriKasKecil {
    value: string
    label: string
}

export interface RekeningSumberKasKecil {
    id_rekening_perusahaan: string
    nama_bank: string
    nomor_rekening: string
    atas_nama_rekening: string | null
    utama: boolean
}

export interface RingkasanKasKecil {
    saldo: number
    masuk_bulan_ini: number
    keluar_bulan_ini: number
    pengisian_diproses: { jumlah: number; nominal: number }
    ada_transaksi: boolean
    ada_saldo_awal: boolean
    boleh_saldo_awal: boolean
    rekening_sumber: RekeningSumberKasKecil | null
    daftar_rekening: RekeningSumberKasKecil[]
    opsi_kategori: OpsiKategoriKasKecil[]
}

export interface BukuKasKecil {
    periode: { dari: string; sampai: string }
    saldo_awal: number
    total_masuk: number
    total_keluar: number
    saldo_akhir: number
    tersaring: { jumlah: number; masuk: number; keluar: number }
    data: TransaksiKasKecil[]
    meta: { page: number; limit: number; total: number; totalPages: number }
}

export type FilterBukuKasKecil = {
    dari?: string
    sampai?: string
    arah?: string
    kategori?: string
    search?: string
}

export type PengisianKasKecilPayload = {
    tanggal: string
    nominal: number
    keterangan: string
    id_rekening_perusahaan?: string
}

export type PengeluaranKasKecilPayload = {
    tanggal: string
    kategori: string
    nominal: number
    penerima: string | null
    keterangan: string
    hapus_bukti?: boolean
}

export type SaldoAwalKasKecilPayload = {
    tanggal: string
    nominal: number
    keterangan: string | null
}

const paramBuku = (filter: FilterBukuKasKecil) => ({
    dari: filter.dari || undefined,
    sampai: filter.sampai || undefined,
    arah: filter.arah || undefined,
    kategori: filter.kategori || undefined,
    search: filter.search || undefined,
})

const formPengeluaran = (payload: PengeluaranKasKecilPayload, bukti: File | null, metode?: 'PUT') => {
    const fd = new FormData()
    if (metode) fd.append('_method', metode)
    fd.append('tanggal', payload.tanggal)
    fd.append('kategori', payload.kategori)
    fd.append('nominal', String(payload.nominal))
    fd.append('keterangan', payload.keterangan)
    if (payload.penerima) fd.append('penerima', payload.penerima)
    if (payload.hapus_bukti) fd.append('hapus_bukti', '1')
    if (bukti) fd.append('bukti', bukti)
    return fd
}

export const kasKecilService = {
    async ringkasan() {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_RINGKASAN)
        return data.data as RingkasanKasKecil
    },

    async buku(page = 1, limit = 10, filter: FilterBukuKasKecil = {}) {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_BUKU, { params: { page, limit, ...paramBuku(filter) } })
        return data.data as BukuKasKecil
    },

    async exportBuku(filter: Pick<FilterBukuKasKecil, 'dari' | 'sampai'>) {
        await unduhDariApi(
            API_ENDPOINTS.KAS_KECIL_BUKU_EXPORT,
            { dari: filter.dari || undefined, sampai: filter.sampai || undefined },
            `buku-kas-kecil-${dayjs().format('YYYY-MM-DD')}.xlsx`,
        )
    },

    async getTransaksi(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_TRANSAKSI_DETAIL(id))
        return data.data as TransaksiKasKecil
    },

    async createPengeluaran(payload: PengeluaranKasKecilPayload, bukti: File | null) {
        const { data } = await axios.post(API_ENDPOINTS.KAS_KECIL_TRANSAKSI, formPengeluaran(payload, bukti))
        return data.data as TransaksiKasKecil
    },

    async updatePengeluaran(id: string, payload: PengeluaranKasKecilPayload, bukti: File | null) {
        const { data } = await axios.post(API_ENDPOINTS.KAS_KECIL_TRANSAKSI_DETAIL(id), formPengeluaran(payload, bukti, 'PUT'))
        return data.data as TransaksiKasKecil
    },

    async deletePengeluaran(id: string) {
        await axios.delete(API_ENDPOINTS.KAS_KECIL_TRANSAKSI_DETAIL(id))
    },

    async catatSaldoAwal(payload: SaldoAwalKasKecilPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KAS_KECIL_SALDO_AWAL, payload)
        return data.data as TransaksiKasKecil
    },

    async hapusSaldoAwal() {
        await axios.delete(API_ENDPOINTS.KAS_KECIL_SALDO_AWAL)
    },

    async listPengisian(page = 1, limit = 10, filter: { search?: string; status?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_PENGISIAN, {
            params: { page, limit, search: filter.search || undefined, status: filter.status || undefined },
        })
        return data as { data: PengisianKasKecil[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },

    async getPengisian(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_PENGISIAN_DETAIL(id))
        return data.data as PengisianKasKecil
    },

    async createPengisian(payload: PengisianKasKecilPayload) {
        const { data } = await axios.post(API_ENDPOINTS.KAS_KECIL_PENGISIAN, payload)
        return data.data as PengisianKasKecil
    },

    async updatePengisian(id: string, payload: PengisianKasKecilPayload) {
        const { data } = await axios.put(API_ENDPOINTS.KAS_KECIL_PENGISIAN_DETAIL(id), payload)
        return data.data as PengisianKasKecil
    },

    async deletePengisian(id: string) {
        await axios.delete(API_ENDPOINTS.KAS_KECIL_PENGISIAN_DETAIL(id))
    },

    async riwayatPengisian(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KAS_KECIL_PENGISIAN_RIWAYAT(id))
        return data.data as PengajuanKeuanganInfo | null
    },
}
