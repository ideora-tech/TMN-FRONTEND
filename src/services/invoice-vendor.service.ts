import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface PembayaranVendor {
    id_pembayaran_vendor: string
    tanggal_bayar: string
    nominal: number
    metode: 'transfer' | 'tunai' | 'giro'
    bank_pengirim: string | null
    no_referensi: string | null
    url_bukti: string | null
    catatan: string | null
}

export interface InvoiceVendor {
    id_invoice_vendor: string
    id_vendor: string
    id_kontrak_vendor: string | null
    nomor_invoice: string
    tanggal_invoice: string
    jatuh_tempo: string | null
    no_po: string | null
    no_do: string | null
    periode_dari: string | null
    periode_sampai: string | null
    dpp: number
    ppn: number
    pph: number
    total: number
    keterangan: string | null
    status: 'draft' | 'diverifikasi' | 'ditolak'
    status_pembayaran: 'belum' | 'sebagian' | 'lunas'
    catatan_verifikasi: string | null
    diverifikasi_oleh?: string | null
    diverifikasi_pada?: string | null
    dibuat_pada?: string
    diubah_pada?: string
    vendor?: { id_vendor: string; nama_vendor: string }
    kontrak?: { id_kontrak_vendor: string; nomor_kontrak: string | null } | null
    total_dibayar?: number
    sisa?: number
    pembayaran?: PembayaranVendor[]
}

export interface AgingInvoiceVendor {
    jumlah: number
    nominal: number
}

export interface OutstandingInvoiceVendor {
    id_invoice_vendor: string
    nomor_invoice: string
    vendor_nama: string
    tanggal_invoice: string
    jatuh_tempo: string | null
    total: number
    dibayar: number
    sisa: number
    hari_terlambat: number
    status_pembayaran: 'belum' | 'sebagian' | 'lunas'
}

export interface MonitoringInvoiceVendor {
    ringkasan: {
        total_outstanding: number
        jumlah_invoice: number
        aging: {
            belum_jatuh_tempo: AgingInvoiceVendor
            hari_1_30: AgingInvoiceVendor
            hari_31_60: AgingInvoiceVendor
            di_atas_60: AgingInvoiceVendor
        }
    }
    outstanding: OutstandingInvoiceVendor[]
}

export type InvoiceVendorPayload = {
    id_vendor: string
    id_kontrak_vendor?: string | null
    nomor_invoice: string
    tanggal_invoice: string
    jatuh_tempo?: string | null
    no_po?: string | null
    no_do?: string | null
    periode_dari?: string | null
    periode_sampai?: string | null
    dpp: number
    ppn?: number
    pph?: number
    keterangan?: string | null
}

export type PembayaranVendorPayload = {
    tanggal_bayar: string
    nominal: number
    metode: 'transfer' | 'tunai' | 'giro'
    bank_pengirim?: string | null
    no_referensi?: string | null
    catatan?: string | null
}

export const invoiceVendorService = {
    async list(page = 1, limit = 10, search?: string, filters?: { status?: string; status_pembayaran?: string; id_vendor?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.INVOICE_VENDOR, {
            params: {
                page, limit,
                search: search || undefined,
                status: filters?.status || undefined,
                status_pembayaran: filters?.status_pembayaran || undefined,
                id_vendor: filters?.id_vendor || undefined,
            },
        })
        return data as { data: InvoiceVendor[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.INVOICE_VENDOR_DETAIL(id))
        return data.data as InvoiceVendor
    },
    async create(payload: InvoiceVendorPayload) {
        const { data } = await axios.post(API_ENDPOINTS.INVOICE_VENDOR, payload)
        return data.data as InvoiceVendor
    },
    async update(id: string, payload: Partial<InvoiceVendorPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.INVOICE_VENDOR_DETAIL(id), payload)
        return data.data as InvoiceVendor
    },
    async remove(id: string) {
        await axios.delete(API_ENDPOINTS.INVOICE_VENDOR_DETAIL(id))
    },
    async verifikasi(id: string, aksi: 'verifikasi' | 'tolak', catatan?: string) {
        const { data } = await axios.patch(API_ENDPOINTS.INVOICE_VENDOR_VERIFIKASI(id), { aksi, catatan: catatan || undefined })
        return data.data as InvoiceVendor
    },
    async monitoring() {
        const { data } = await axios.get(API_ENDPOINTS.INVOICE_VENDOR_MONITORING)
        return data.data as MonitoringInvoiceVendor
    },
    async listPembayaran(idInvoice: string) {
        const { data } = await axios.get(API_ENDPOINTS.INVOICE_VENDOR_PEMBAYARAN(idInvoice))
        return data.data as PembayaranVendor[]
    },
    async createPembayaran(idInvoice: string, payload: PembayaranVendorPayload, bukti?: File | null) {
        const fd = new FormData()
        fd.append('tanggal_bayar', payload.tanggal_bayar)
        fd.append('nominal', String(payload.nominal))
        fd.append('metode', payload.metode)
        if (payload.bank_pengirim) fd.append('bank_pengirim', payload.bank_pengirim)
        if (payload.no_referensi) fd.append('no_referensi', payload.no_referensi)
        if (payload.catatan) fd.append('catatan', payload.catatan)
        if (bukti) fd.append('bukti', bukti)
        const { data } = await axios.post(API_ENDPOINTS.INVOICE_VENDOR_PEMBAYARAN(idInvoice), fd)
        return data.data as PembayaranVendor
    },
    async deletePembayaran(idInvoice: string, idPembayaran: string) {
        await axios.delete(API_ENDPOINTS.INVOICE_VENDOR_PEMBAYARAN_DELETE(idInvoice, idPembayaran))
    },
}
