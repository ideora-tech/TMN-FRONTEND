import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPengajuan = 'diajukan' | 'dicek' | 'disetujui' | 'ditolak' | 'ditransfer'
export type KategoriPengajuan = 'uang_jalan' | 'legalitas' | 'perawatan' | 'sparepart' | 'penggajian' | 'lainnya'
export type ArahArusKas = 'masuk' | 'keluar'
export type SumberArusKas =
    | 'faktur'
    | 'pengajuan_pengeluaran'
    | 'pembayaran_vendor'

export interface PengajuanPengeluaran {
    id_pengajuan: string
    id_perusahaan: string
    id_trip: string | null
    id_perawatan: string | null
    id_armada_perawatan?: string | null
    id_pembelian: string | null
    id_periode: string | null
    nomor_pengajuan: string
    kategori: KategoriPengajuan
    nominal: number
    tanggal_pengajuan: string
    penerima: string
    keterangan: string | null
    status: StatusPengajuan
    alasan_ditolak: string | null
    dicek_oleh: string | null
    dicek_pada: string | null
    disetujui_oleh: string | null
    disetujui_pada: string | null
    ditransfer_oleh: string | null
    ditransfer_pada: string | null
    tanggal_transfer: string | null
    url_bukti: string | null
    dibuat_pada: string
    diubah_pada: string | null
}

export type PengajuanPayload = {
    kategori: KategoriPengajuan
    nominal: number
    tanggal_pengajuan: string
    penerima: string
    keterangan?: string | null
}

export interface ReferensiTransaksi {
    id: string
    label: string
}

export interface TransaksiArusKas {
    tanggal: string
    arah: ArahArusKas
    sumber: SumberArusKas
    kategori: KategoriPengajuan | null
    nominal: number
    referensi: ReferensiTransaksi
    keterangan: string | null
    url_bukti: string | null
    dapat_diubah: boolean
}

export interface RingkasanArusKas {
    total_pemasukan: number
    total_pengeluaran: number
    netto: number
}

export interface ArusKasRekap {
    ringkasan: RingkasanArusKas
    transaksi: TransaksiArusKas[]
}

function buildPengajuanFormData(payload: Partial<PengajuanPayload>, bukti?: File | null): FormData {
    const fd = new FormData()
    if (payload.kategori !== undefined) fd.append('kategori', payload.kategori)
    if (payload.nominal !== undefined) fd.append('nominal', String(payload.nominal))
    if (payload.tanggal_pengajuan !== undefined) fd.append('tanggal_pengajuan', payload.tanggal_pengajuan)
    if (payload.penerima !== undefined) fd.append('penerima', payload.penerima)
    if (payload.keterangan) fd.append('keterangan', payload.keterangan)
    if (bukti) fd.append('bukti', bukti)
    return fd
}

export const arusKasService = {
    async getRekap(params?: { dari?: string; sampai?: string; arah?: ArahArusKas; sumber?: SumberArusKas }) {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS, {
            params: {
                dari: params?.dari || undefined,
                sampai: params?.sampai || undefined,
                arah: params?.arah || undefined,
                sumber: params?.sumber || undefined,
            },
        })
        return data.data as ArusKasRekap
    },

    async exportExcel(params?: { dari?: string; sampai?: string; arah?: ArahArusKas; sumber?: SumberArusKas }) {
        const res = await axios.get(API_ENDPOINTS.ARUS_KAS_EXPORT_EXCEL, {
            responseType: 'blob',
            params: {
                dari: params?.dari || undefined,
                sampai: params?.sampai || undefined,
                arah: params?.arah || undefined,
                sumber: params?.sumber || undefined,
            },
        })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `arus-kas-${params?.dari || 'semua'}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },

    async listPengajuan(status?: StatusPengajuan) {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS_PENGAJUAN, {
            params: { status: status || undefined },
        })
        return data.data as PengajuanPengeluaran[]
    },

    async getPengajuan(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_DETAIL(id))
        return data.data as PengajuanPengeluaran
    },

    async createPengajuan(payload: PengajuanPayload, bukti?: File | null) {
        const body = bukti ? buildPengajuanFormData(payload, bukti) : payload
        const { data } = await axios.post(API_ENDPOINTS.ARUS_KAS_PENGAJUAN, body)
        return data.data as PengajuanPengeluaran
    },

    async updatePengajuan(id: string, payload: Partial<PengajuanPayload>, bukti?: File | null) {
        if (bukti) {
            const fd = buildPengajuanFormData(payload, bukti)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_DETAIL(id), fd)
            return data.data as PengajuanPengeluaran
        }
        const { data } = await axios.put(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_DETAIL(id), payload)
        return data.data as PengajuanPengeluaran
    },

    async deletePengajuan(id: string) {
        await axios.delete(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_DETAIL(id))
    },

    async cek(id: string) {
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_CEK(id))
        return data.data as PengajuanPengeluaran
    },

    async setujui(id: string) {
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_SETUJUI(id))
        return data.data as PengajuanPengeluaran
    },

    async tolak(id: string, alasan: string) {
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_TOLAK(id), { alasan })
        return data.data as PengajuanPengeluaran
    },

    async transfer(id: string, tanggal_transfer: string, bukti?: File | null) {
        if (bukti) {
            const fd = new FormData()
            fd.append('tanggal_transfer', tanggal_transfer)
            fd.append('bukti', bukti)
            fd.append('_method', 'PATCH')
            const { data } = await axios.post(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_TRANSFER(id), fd)
            return data.data as PengajuanPengeluaran
        }
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_TRANSFER(id), { tanggal_transfer })
        return data.data as PengajuanPengeluaran
    },
}
