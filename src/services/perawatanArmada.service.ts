import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PengajuanKeuanganInfo } from './arusKas.service'

export type StatusPerawatan = 'terjadwal' | 'dalam_proses' | 'selesai' | 'dibatalkan'

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

export interface BuktiPerawatan {
    id_bukti: string
    url_file: string
    nama_asli: string
}

export interface PerawatanArmada {
    id_perawatan: string
    id_armada: string
    id_jenis_perawatan: string | null
    sparepart?: PerawatanSparepartItem[]
    bukti?: BuktiPerawatan[]
    tanggal: string
    jenis_perawatan: string
    biaya: number
    km_odometer: number | null
    status: StatusPerawatan
    alasan_batal: string | null
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

export interface RekapPerawatanUnit {
    id_armada: string
    nopol: string
    merk: string | null
    jumlah_perawatan: number
    biaya_jasa: number
    biaya_sparepart: number
    total_biaya: number
}

export type FormatLaporan = 'excel' | 'pdf'

type ParamPeriode = { tanggal_dari?: string; tanggal_sampai?: string }

async function unduhBlob(url: string, filename: string, params?: ParamPeriode) {
    const res = await axios.get(url, { responseType: 'blob', params })
    const href = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
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
    interval_hari: number | null
    interval_km: number | null
    tanggal_servis_terakhir: string | null
    jadwal_servis_berikutnya: string | null
    km_servis_terakhir: number | null
    km_sekarang: number | null
    km_jatuh_tempo: number | null
    sisa_km: number | null
    status_km: StatusPrediksi | null
    status: StatusPrediksi
    sisa_hari: number | null
    sparepart_standar: PrediksiSparepartStandar[]
}

export const perawatanArmadaService = {
    async listAll(params?: { page?: number; limit?: number; id_armada?: string; status?: string; jatuh_tempo?: '1'; search?: string; tanggal_dari?: string; tanggal_sampai?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.PERAWATAN_ARMADA, { params })
        return data as { data: PerawatanArmadaWithArmada[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(idArmada: string, id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id))
        return data.data as PerawatanArmada
    },
    async infoPengajuan(idArmada: string, id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PERAWATAN_PENGAJUAN(idArmada, id))
        return data.data as PengajuanKeuanganInfo | null
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
    async delete(idArmada: string, id: string, alasan: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_PERAWATAN_DETAIL(idArmada, id), { data: { alasan } })
    },
    async batal(idArmada: string, id: string, alasan: string) {
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_PERAWATAN_BATAL(idArmada, id), { alasan })
        return data.data as PerawatanArmada
    },
    async rekapPerUnit(params?: ParamPeriode) {
        const { data } = await axios.get(API_ENDPOINTS.PERAWATAN_REKAP_PER_UNIT, { params })
        return data.data as RekapPerawatanUnit[]
    },
    async downloadLaporanUnit(idArmada: string, nopol: string, format: FormatLaporan, params?: ParamPeriode) {
        const ekstensi = format === 'excel' ? 'xlsx' : 'pdf'
        await unduhBlob(
            API_ENDPOINTS.ARMADA_PERAWATAN_EXPORT(idArmada, format),
            `perawatan-${nopol.replace(/\s/g, '')}.${ekstensi}`,
            params,
        )
    },
    async downloadRekapPerUnit(format: FormatLaporan, params?: ParamPeriode) {
        const ekstensi = format === 'excel' ? 'xlsx' : 'pdf'
        await unduhBlob(API_ENDPOINTS.PERAWATAN_REKAP_EXPORT(format), `rekap-perawatan-unit.${ekstensi}`, params)
    },
    async uploadBukti(idArmada: string, id: string, files: File[]) {
        const formData = new FormData()
        files.forEach(file => formData.append('bukti[]', file))
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_PERAWATAN_BUKTI(idArmada, id), formData)
        return data.data as PerawatanArmada
    },
    async hapusBukti(idArmada: string, id: string, idBukti: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_PERAWATAN_BUKTI_DETAIL(idArmada, id, idBukti))
    },
    async prediksiPerawatan(idArmada: string, days = 30) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_PREDIKSI_PERAWATAN(idArmada), { params: { days } })
        return data.data as PrediksiPerawatanItem[]
    },
}
