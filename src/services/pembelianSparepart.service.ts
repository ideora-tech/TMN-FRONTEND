import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPembelian = 'diajukan' | 'disetujui_manager' | 'disetujui_finance' | 'ditolak' | 'dibeli' | 'lunas'

export interface PembelianItem {
    id_item: string
    id_sparepart: string
    nama_sparepart: string
    qty: number
    harga_estimasi: number
    harga_aktual: number | null
    selisih: number | null
}

export interface PembelianBukti {
    id_bukti: string
    url_file: string
    nama_asli: string
}

export interface PembayaranPembelian {
    nominal_ditransfer: number
    tanggal_transfer: string
    url_bukti: string | null
    total_aktual: number | null
    selisih: number | null
}

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
    riwayat: RiwayatPengajuanKeuangan[]
}

export interface PembelianSparepart {
    id_pembelian: string
    nomor_pengajuan: string
    id_supplier: string
    nama_supplier: string | null
    id_perawatan: string | null
    nopol_armada: string | null
    status: StatusPembelian
    alasan_ditolak: string | null
    disetujui_manager_pada: string | null
    disetujui_finance_pada: string | null
    total_estimasi: number
    total_aktual: number | null
    selisih: number | null
    tanggal_pengajuan: string
    tanggal_pembelian: string | null
    tanggal_pembayaran: string | null
    keterangan: string | null
    items: PembelianItem[]
    bukti: PembelianBukti[]
    pembayaran: PembayaranPembelian | null
    pengajuan_keuangan?: PengajuanKeuanganInfo | null
    dibuat_pada: string
}

export type PembelianPayload = {
    id_supplier: string
    id_perawatan?: string | null
    tanggal_pengajuan: string
    keterangan?: string | null
    items: { id_sparepart: string; qty: number; harga_estimasi: number }[]
}

export interface LaporanPembelian {
    ringkasan: { total_estimasi: number; total_aktual: number; selisih: number; jumlah: number }
    per_bulan: { bulan: string; total_estimasi: number; total_aktual: number; jumlah: number }[]
    per_kategori: { kategori: string; total_aktual: number }[]
    per_armada: { nopol: string; total_aktual: number; jumlah: number }[]
}

type ListMeta = { page: number; total: number; totalPages: number; limit: number }

export const pembelianSparepartService = {
    async list(params?: { page?: number; limit?: number; search?: string; status?: string; id_supplier?: string; dari?: string; sampai?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.PEMBELIAN_SPAREPART, { params })
        return data as { data: PembelianSparepart[]; meta: ListMeta }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PEMBELIAN_SPAREPART_DETAIL(id))
        return data.data as PembelianSparepart
    },
    async create(payload: PembelianPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PEMBELIAN_SPAREPART, payload)
        return data.data as PembelianSparepart
    },
    async update(id: string, payload: PembelianPayload) {
        const { data } = await axios.put(API_ENDPOINTS.PEMBELIAN_SPAREPART_DETAIL(id), payload)
        return data.data as PembelianSparepart
    },
    async remove(id: string) {
        await axios.delete(API_ENDPOINTS.PEMBELIAN_SPAREPART_DETAIL(id))
    },
    async realisasi(id: string, payload: { tanggal_pembelian: string; items: { id_item: string; harga_aktual: number }[] }) {
        const { data } = await axios.patch(API_ENDPOINTS.PEMBELIAN_SPAREPART_REALISASI(id), payload)
        return data.data as PembelianSparepart
    },
    async uploadBukti(id: string, files: File[]) {
        const form = new FormData()
        files.forEach(f => form.append('bukti[]', f))
        const { data } = await axios.post(API_ENDPOINTS.PEMBELIAN_SPAREPART_BUKTI(id), form)
        return data.data as PembelianSparepart
    },
    async hapusBukti(id: string, idBukti: string) {
        const { data } = await axios.delete(API_ENDPOINTS.PEMBELIAN_SPAREPART_BUKTI_DETAIL(id, idBukti))
        return data.data as PembelianSparepart
    },
    async laporan(params?: { dari?: string; sampai?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.PEMBELIAN_SPAREPART_LAPORAN, { params })
        return data.data as LaporanPembelian
    },
    async downloadLaporan(format: 'excel' | 'pdf', params?: { dari?: string; sampai?: string }) {
        const res = await axios.get(API_ENDPOINTS.PEMBELIAN_SPAREPART_LAPORAN_EXPORT(format), { responseType: 'blob', params })
        const ekstensi = format === 'excel' ? 'xlsx' : 'pdf'
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `laporan-pembelian-sparepart.${ekstensi}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
