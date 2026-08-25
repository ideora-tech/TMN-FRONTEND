import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface FakturItem {
    deskripsi: string
    qty: number
    harga_satuan: number
    subtotal: number
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

export interface Faktur {
    id_faktur: string
    nomor_faktur: string
    total: number
    nama_pajak?: string | null
    persen_pajak?: number | null
    status: 'draft' | 'terkirim' | 'lunas' | 'batal'
    tanggal_faktur?: string
    jatuh_tempo?: string
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
    }) {
        const { data } = await axios.post(API_ENDPOINTS.FAKTUR, payload)
        return data.data as Faktur
    },
    async update(id: string, payload: {
        tanggal_faktur?: string | null
        jatuh_tempo?: string | null
        nama_pajak?: string | null
        persen_pajak?: number | null
        items?: { deskripsi: string; qty: number; harga_satuan: number }[]
    }) {
        const { data } = await axios.put(API_ENDPOINTS.FAKTUR_DETAIL(id), payload)
        return data.data as Faktur
    },
    async updateStatus(id: string, status: string) {
        const { data } = await axios.patch(API_ENDPOINTS.FAKTUR_STATUS(id), { status })
        return data.data as Faktur
    },
}
