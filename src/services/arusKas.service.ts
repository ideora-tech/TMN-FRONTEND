import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPengajuan = 'diajukan' | 'dicek' | 'menunggu_approval' | 'disetujui' | 'siap_transfer' | 'ditolak' | 'ditransfer'
export type StatusApproval = 'menunggu' | 'disetujui' | 'ditolak'
export type KeputusanApproval = 'setuju' | 'tolak'
export type KategoriPengajuan = 'uang_jalan' | 'legalitas' | 'perawatan' | 'sparepart' | 'penggajian' | 'pembelian_aset' | 'pembayaran_pinjaman' | 'pembayaran_vendor' | 'lainnya'
export type ArahArusKas = 'masuk' | 'keluar'
export type SumberArusKas =
    | 'faktur'
    | 'pengajuan_pengeluaran'
    | 'pembayaran_vendor'
    | 'pemasukan_manual'

export type KategoriPemasukan =
    | 'pendapatan_jasa'
    | 'penjualan_aset'
    | 'pengembalian_dana'
    | 'modal_pinjaman'
    | 'lainnya'

export interface RiwayatPengajuanKeuangan {
    status: string
    waktu: string | null
    oleh: string | null
    keterangan: string | null
}

export interface PengajuanKeuanganInfo {
    id_pengajuan: string
    nomor_pengajuan: string
    status: string
    nominal: number
    url_bukti?: string | null
    riwayat: RiwayatPengajuanKeuangan[]
}

export interface ApprovalPengajuan {
    id_pengguna: string
    nama: string
    status: StatusApproval
    catatan: string | null
    waktu_aksi: string | null
}

export interface ApprovalProgress {
    disetujui: number
    total: number
}

export interface PengajuanPengeluaran {
    id_pengajuan: string
    id_perusahaan: string
    id_trip: string | null
    id_perawatan: string | null
    id_armada_perawatan?: string | null
    id_pembelian: string | null
    id_periode: string | null
    id_invoice_vendor?: string | null
    id_supir: string | null
    id_proyek: string | null
    periode_dari: string | null
    periode_sampai: string | null
    tarif_per_hari: number | string | null
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
    approval: ApprovalPengajuan[]
    approval_progress: ApprovalProgress | null
    bisa_approve: boolean
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
    kategori: KategoriPengajuan | KategoriPemasukan | null
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

export interface PemasukanRow {
    jenis: 'invoice' | 'manual'
    id: string
    nomor: string
    kategori: KategoriPemasukan | null
    tanggal: string
    nominal: number
    sumber_dana: string | null
    keterangan: string | null
    url_bukti: string | null
    dapat_diubah: boolean
}

export interface Pemasukan {
    id_pemasukan: string
    id_perusahaan: string
    nomor_pemasukan: string
    kategori: KategoriPemasukan
    tanggal: string
    nominal: number
    sumber_dana: string
    keterangan: string | null
    url_bukti: string | null
    dibuat_pada: string
    diubah_pada: string | null
}

export type PemasukanPayload = {
    kategori: KategoriPemasukan
    nominal: number
    tanggal: string
    sumber_dana: string
    keterangan?: string | null
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

function buildPemasukanFormData(payload: Partial<PemasukanPayload>, bukti?: File | null): FormData {
    const fd = new FormData()
    if (payload.kategori !== undefined) fd.append('kategori', payload.kategori)
    if (payload.nominal !== undefined) fd.append('nominal', String(payload.nominal))
    if (payload.tanggal !== undefined) fd.append('tanggal', payload.tanggal)
    if (payload.sumber_dana !== undefined) fd.append('sumber_dana', payload.sumber_dana)
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

    async menungguApprovalSaya() {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_MENUNGGU_SAYA)
        return data.data as {
            pengajuan: PengajuanPengeluaran[]
            ringkasan: { jumlah: number; total_nominal: number }
        }
    },

    async riwayatPengajuan(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_RIWAYAT(id))
        return data.data as PengajuanKeuanganInfo
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
        return { data: data.data as PengajuanPengeluaran, message: data.message as string }
    },

    async tolak(id: string, alasan: string) {
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_TOLAK(id), { alasan })
        return data.data as PengajuanPengeluaran
    },

    async keputusanApproval(id: string, keputusan: KeputusanApproval, catatan?: string) {
        const { data } = await axios.patch(API_ENDPOINTS.ARUS_KAS_PENGAJUAN_APPROVAL(id), {
            keputusan,
            catatan: catatan || undefined,
        })
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

    async listPemasukan(params?: { dari?: string; sampai?: string; jenis?: 'invoice' | 'manual'; kategori?: KategoriPemasukan }) {
        const { data } = await axios.get(API_ENDPOINTS.ARUS_KAS_PEMASUKAN, {
            params: {
                dari: params?.dari || undefined,
                sampai: params?.sampai || undefined,
                jenis: params?.jenis || undefined,
                kategori: params?.kategori || undefined,
            },
        })
        return data.data as PemasukanRow[]
    },

    async createPemasukan(payload: PemasukanPayload, bukti?: File | null) {
        const body = bukti ? buildPemasukanFormData(payload, bukti) : payload
        const { data } = await axios.post(API_ENDPOINTS.ARUS_KAS_PEMASUKAN, body)
        return data.data as Pemasukan
    },

    async updatePemasukan(id: string, payload: Partial<PemasukanPayload>, bukti?: File | null) {
        if (bukti) {
            const fd = buildPemasukanFormData(payload, bukti)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.ARUS_KAS_PEMASUKAN_DETAIL(id), fd)
            return data.data as Pemasukan
        }
        const { data } = await axios.put(API_ENDPOINTS.ARUS_KAS_PEMASUKAN_DETAIL(id), payload)
        return data.data as Pemasukan
    },

    async deletePemasukan(id: string) {
        await axios.delete(API_ENDPOINTS.ARUS_KAS_PEMASUKAN_DETAIL(id))
    },
}
