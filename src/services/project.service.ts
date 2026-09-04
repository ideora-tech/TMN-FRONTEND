import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { ProyekRutePayload } from '@/services/proyekRute.service'
import { Penawaran } from '@/services/penawaran.service'
import { Faktur } from '@/services/faktur.service'

export type TipeHargaProyek = 'per_rit' | 'borongan'

export interface RealisasiProyek {
    total_rit: number
    nilai_realisasi: number
    nilai_penawaran: number | null
    sisa_belum_difakturkan: number | null
}

export interface Project {
    id_proyek: string
    id_klien: string
    nama_klien?: string | null
    kode_proyek: string
    nama_proyek: string
    tanggal_mulai?: string
    tanggal_selesai?: string
    status: 'draft' | 'menunggu_approval' | 'aktif' | 'selesai' | 'batal'
    tipe_harga: TipeHargaProyek
    keterangan?: string
    harga_penawaran?: number | null
    harga_proyek?: number | null
    realisasi?: RealisasiProyek | null
    dibuat_pada?: string | null
}

export interface PenawaranRevisiItemPayload {
    id_rute: string
    id_jenis_kendaraan?: string | null
    harga_satuan?: number | null
    estimasi_ritase?: number
    keterangan?: string | null
}

export interface PenawaranRevisiPayload {
    judul?: string
    nilai_penawaran?: number | null
    catatan?: string | null
    items?: PenawaranRevisiItemPayload[]
}

export interface FakturBoronganPayload {
    nominal: number
    uraian: string
    tanggal_faktur: string
    jatuh_tempo?: string | null
}

export const projectService = {
    async list(page = 1, limit = 15, search?: string, status?: string) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK, { params: { page, limit, search: search || undefined, status: status || undefined } })
        return data as { data: Project[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listByKlien(idKlien: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK, { params: { id_klien: idKlien, page, limit } })
        return data as { data: Project[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK_DETAIL(id))
        return data.data as Project
    },
    async create(payload: Partial<Omit<Project, 'id_proyek' | 'kode_proyek' | 'status' | 'realisasi'>> & { nama_proyek: string; status?: string; id_penawaran?: string; rute?: ProyekRutePayload[] }) {
        const { data } = await axios.post(API_ENDPOINTS.PROYEK, payload)
        return data.data as Project
    },
    async update(id: string, payload: Partial<Project>) {
        const { data } = await axios.put(API_ENDPOINTS.PROYEK_DETAIL(id), payload)
        return data.data as Project
    },
    async updateStatus(id: string, status: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PROYEK_STATUS(id), { status })
        return data.data as Project
    },
    async ajukanApproval(id: string) {
        const { data } = await axios.post(`${API_ENDPOINTS.PROYEK_DETAIL(id)}/ajukan-approval`)
        return data.data as Project
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PROYEK_DETAIL(id))
    },
    async penawaranRevisi(id: string, payload: PenawaranRevisiPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PROYEK_PENAWARAN_REVISI(id), payload)
        return data.data as Penawaran
    },
    async fakturBorongan(id: string, payload: FakturBoronganPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PROYEK_FAKTUR_BORONGAN(id), payload)
        return data.data as Faktur
    },
}
