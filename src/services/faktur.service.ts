import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface FakturItem {
    deskripsi: string
    qty: number
    harga_satuan: number
    subtotal: number
}

export interface FakturPajak {
    nama: string
    persen: number
}

export interface FakturTrip {
    id_trip: string
    rute: string | null
    armada_nopol: string | null
    supir_nama: string | null
    waktu_berangkat: string | null
    waktu_checkin: string | null
    waktu_checkout: string | null
    status: string
}

export interface PembayaranFaktur {
    id_pembayaran_faktur: string
    tanggal_bayar: string
    nominal: number
    potongan: number
    keterangan_potongan: string | null
    no_referensi: string | null
    url_bukti: string | null
    catatan: string | null
    dicatat_oleh: string | null
    dibuat_pada: string | null
}

export type KelompokUmurPiutang = 'belum_jatuh_tempo' | 'hari_1_30' | 'hari_31_60' | 'di_atas_60'

export interface OutstandingFakturBaris {
    id_faktur: string
    nomor_faktur: string
    id_klien: string | null
    nama_klien: string | null
    nama_proyek: string | null
    tanggal_faktur: string | null
    jatuh_tempo: string | null
    hari_terlambat: number
    kelompok: KelompokUmurPiutang
    total: number
    terbayar: number
    sisa: number
}

type JumlahNominal = { jumlah: number; nominal: number }

export interface OutstandingFaktur {
    ringkasan: {
        jumlah_invoice: number
        total_tagihan: number
        total_terbayar: number
        total_outstanding: number
        lewat_jatuh_tempo: JumlahNominal
        jatuh_tempo_7_hari: JumlahNominal
        diterima_bulan_ini: number
        aging: Record<KelompokUmurPiutang, JumlahNominal>
    }
    per_klien: { id_klien: string | null; nama_klien: string; jumlah: number; outstanding: number; terlambat: number }[]
    data: OutstandingFakturBaris[]
    meta: { page: number; limit: number; total: number; totalPages: number }
}

export type FilterOutstandingFaktur = { id_klien?: string; kelompok?: string; search?: string }

export interface Faktur {
    id_faktur: string
    nomor_faktur: string
    total: number
    pajak?: FakturPajak[]
    nama_pajak?: string | null
    persen_pajak?: number | null
    status: 'draft' | 'menunggu_approval' | 'terkirim' | 'lunas' | 'batal'
    alasan_ditolak_internal: string | null
    approval_aktif?: boolean | null
    tanggal_faktur?: string
    jatuh_tempo?: string
    tanggal_lunas?: string | null
    diterima?: number | null
    potongan_bayar?: number | null
    terbayar?: number | null
    sisa?: number | null
    pembayaran?: PembayaranFaktur[] | null
    id_proyek?: string | null
    id_klien?: string | null
    id_penawaran?: string | null
    nama_proyek?: string | null
    nama_klien?: string | null
    nomor_penawaran?: string | null
    nilai_penawaran?: number | null
    items?: FakturItem[]
    dibuat_pada?: string
    diubah_pada?: string | null
    dibuat_oleh_nama?: string | null
    diubah_oleh_nama?: string | null
    riwayat_status?: RiwayatFaktur[] | null
    trip_terkait?: FakturTrip[]
}

export interface RiwayatFaktur {
    status: string
    keterangan: string | null
    waktu: string | null
    oleh: string | null
}

export const fakturService = {
    async list(page = 1, limit = 15, search?: string, status?: string) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR, { params: { page, limit, search: search || undefined, status: status || undefined } })
        return data as { data: Faktur[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listByKlien(idKlien: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR, { params: { id_klien: idKlien, page, limit } })
        return data as { data: Faktur[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR_DETAIL(id))
        return data.data as Faktur
    },
    async create(payload: {
        nomor_faktur: string
        id_proyek?: string
        id_klien?: string
        tanggal_faktur?: string
        jatuh_tempo?: string
        items: FakturItem[]
        pajak?: FakturPajak[]
    }) {
        const { data } = await axios.post(API_ENDPOINTS.FAKTUR, payload)
        return data.data as Faktur
    },
    async update(id: string, payload: {
        tanggal_faktur?: string | null
        jatuh_tempo?: string | null
        pajak?: FakturPajak[]
        items?: { deskripsi: string; qty: number; harga_satuan: number }[]
    }) {
        const { data } = await axios.put(API_ENDPOINTS.FAKTUR_DETAIL(id), payload)
        return data.data as Faktur
    },
    async updateStatus(id: string, status: string) {
        const { data } = await axios.patch(API_ENDPOINTS.FAKTUR_STATUS(id), { status })
        return data.data as Faktur
    },
    async ajukanApproval(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.FAKTUR_AJUKAN_APPROVAL(id))
        return data.data as Faktur
    },
    async catatPembayaran(id: string, payload: { tanggal_bayar: string; nominal: number; potongan?: number; keterangan_potongan?: string; no_referensi?: string; catatan?: string }, bukti?: File | null) {
        const form = new FormData()
        form.append('tanggal_bayar', payload.tanggal_bayar)
        form.append('nominal', String(payload.nominal))
        if (payload.potongan) form.append('potongan', String(payload.potongan))
        if (payload.keterangan_potongan) form.append('keterangan_potongan', payload.keterangan_potongan)
        if (payload.no_referensi) form.append('no_referensi', payload.no_referensi)
        if (payload.catatan) form.append('catatan', payload.catatan)
        if (bukti) form.append('bukti', bukti)
        const { data } = await axios.post(API_ENDPOINTS.FAKTUR_PEMBAYARAN(id), form)
        return data.data as Faktur
    },
    async hapusPembayaran(id: string, idPembayaran: string, alasan: string) {
        const { data } = await axios.delete(API_ENDPOINTS.FAKTUR_PEMBAYARAN_HAPUS(id, idPembayaran), { data: { alasan } })
        return data.data as Faktur
    },
    async outstanding(params?: FilterOutstandingFaktur & { page?: number; limit?: number }) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR_OUTSTANDING, { params })
        return data.data as OutstandingFaktur
    },
    async unduhOutstanding(params?: FilterOutstandingFaktur) {
        const { data } = await axios.get(API_ENDPOINTS.FAKTUR_OUTSTANDING_EXPORT, { params, responseType: 'blob' })
        return data as Blob
    },
}
