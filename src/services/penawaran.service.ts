import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type PenawaranStatus = 'draft' | 'terkirim' | 'negosiasi' | 'disetujui' | 'ditolak'

export interface Penawaran {
    id_penawaran: string
    id_perusahaan: string
    id_klien: string | null
    nomor_penawaran: string
    judul: string
    nilai_penawaran: number | null
    status: PenawaranStatus
    tanggal_penawaran: string | null
    tanggal_berlaku: string | null
    catatan: string | null
    id_proyek: string | null
    aktif: boolean
    dibuat_pada: string
    diubah_pada: string
    items?: PenawaranItem[]
}

export interface PenawaranPayload {
    nomor_penawaran: string
    judul: string
    id_klien?: string | null
    nilai_penawaran?: number | null
    status?: PenawaranStatus
    tanggal_penawaran?: string | null
    tanggal_berlaku?: string | null
    catatan?: string | null
    items?: PenawaranItemPayload[]
}

export interface PenawaranItem {
    id_penawaran_item: string
    id_penawaran: string
    id_rute: string
    id_jenis_kendaraan: string
    id_tarif_rute: string | null
    kode_rute: string | null
    nama_rute: string | null
    asal: string | null
    tujuan: string | null
    nama_jenis: string | null
    harga_satuan: number
    estimasi_ritase: number
    subtotal: number
    keterangan: string | null
}

export interface PenawaranItemPayload {
    id_rute: string
    id_jenis_kendaraan: string
    id_tarif_rute?: string | null
    harga_satuan: number
    estimasi_ritase?: number
    keterangan?: string | null
}

export const penawaranService = {
    list: (params?: Record<string, unknown>) =>
        axios.get(API_ENDPOINTS.PENAWARAN, { params }).then(r => r.data),

    get: (id: string): Promise<Penawaran> =>
        axios.get(API_ENDPOINTS.PENAWARAN_DETAIL(id)).then(r => r.data?.data),

    create: (payload: PenawaranPayload): Promise<Penawaran> =>
        axios.post(API_ENDPOINTS.PENAWARAN, payload).then(r => r.data?.data),

    update: (id: string, payload: Partial<PenawaranPayload>): Promise<Penawaran> =>
        axios.put(API_ENDPOINTS.PENAWARAN_DETAIL(id), payload).then(r => r.data?.data),

    updateStatus: (id: string, status: PenawaranStatus): Promise<Penawaran> =>
        axios.put(API_ENDPOINTS.PENAWARAN_STATUS(id), { status }).then(r => r.data?.data),

    delete: (id: string): Promise<void> =>
        axios.delete(API_ENDPOINTS.PENAWARAN_DETAIL(id)).then(() => undefined),
}
