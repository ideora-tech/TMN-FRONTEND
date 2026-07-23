import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusPerawatan = 'terjadwal' | 'dalam_proses' | 'selesai'

export interface PerawatanSparepartItem {
    id_perawatan_sparepart: string
    id_sparepart: string
    nama_sparepart: string
    qty: number
    harga: number
    subtotal: number
}

export type PerawatanSparepartInput = {
    id_sparepart: string
    qty: number
    harga: number
}

export interface PerawatanArmada {
    id_perawatan: string
    id_armada: string
    id_jenis_perawatan: string | null
    sparepart?: PerawatanSparepartItem[]
    tanggal: string
    jenis_perawatan: string
    biaya: number
    km_odometer: number | null
    status: StatusPerawatan
    jadwal_servis_berikutnya: string | null
    keterangan: string | null
    dibuat_pada: string
    diubah_pada: string
}

type PerawatanPayload = {
    tanggal: string
    jenis_perawatan?: string
    id_jenis_perawatan?: string | null
    sparepart?: PerawatanSparepartInput[]
    biaya: number
    km_odometer?: number | null
    status?: StatusPerawatan
    jadwal_servis_berikutnya?: string | null
    keterangan?: string | null
}

export interface PerawatanArmadaWithArmada extends PerawatanArmada {
    armada_nopol: string | null
    armada_merk: string | null
}

export type StatusPrediksi = 'lewat_jatuh_tempo' | 'segera' | 'aman' | 'belum_pernah'

export interface PrediksiSparepartStandar {
    id_sparepart: string
    nama_sparepart: string
    satuan_sparepart: string
    qty_standar: number
    harga_standar: number
}

export interface PrediksiPerawatanItem {
    id_jenis_perawatan: string
    nama_jenis_perawatan: string
    interval_hari: number
    tanggal_servis_terakhir: string | null
    jadwal_servis_berikutnya: string | null
    status: StatusPrediksi
    sisa_hari: number | null
    sparepart_standar: PrediksiSparepartStandar[]
}

export const perawatanArmadaService = {
    async listAll(params?: { page?: number; limit?: number; id_armada?: string; status?: StatusPerawatan | ''; jatuh_tempo?: '1' }) {
        const { data } = await axios.get(API_ENDPOINTS.PERAWATAN_ARMADA, { params })
        return data as { data: PerawatanArmadaWithArmada[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(idArmada: string, id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id))
        return data.data as PerawatanArmada
    },
    async list(idArmada: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada))
        return data.data as PerawatanArmada[]
    },
    async create(idArmada: string, payload: PerawatanPayload) {
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada), payload)
        return data.data as PerawatanArmada
    },
    async update(idArmada: string, id: string, payload: Partial<PerawatanPayload>) {
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id), payload)
        return data.data as PerawatanArmada
    },
    async delete(idArmada: string, id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id))
    },
    async prediksiPerawatan(idArmada: string, days = 30) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PREDIKSI_PERAWATAN(idArmada), { params: { days } })
        return data.data as PrediksiPerawatanItem[]
    },
}
