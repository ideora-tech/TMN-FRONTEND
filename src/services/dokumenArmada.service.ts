import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface DokumenArmada {
    id_dokumen_armada: string
    id_armada: string
    jenis_dokumen: string
    nomor: string | null
    berlaku_sampai: string | null
    url_file: string | null
    aktif: boolean
    id_dokumen_sebelumnya: string | null
    dibuat_pada: string
}

export interface DokumenArmadaWithArmada extends DokumenArmada {
    armada_nopol: string | null
    armada_merk: string | null
}

export interface DokumenArmadaDetail extends DokumenArmadaWithArmada {
    riwayat: DokumenArmadaWithArmada[]
    id_dokumen_pengganti: string | null
}

export type KondisiDokumenUnit = 'habis' | 'segera' | 'belum_ada' | 'aman'

export interface DokumenPerUnit {
    id_armada: string
    nopol: string
    merk: string | null
    nama_jenis_kendaraan: string | null
    status_armada: string
    kondisi: KondisiDokumenUnit
    jumlah_dokumen: number
    terdekat: { jenis_dokumen: string; berlaku_sampai: string } | null
    dokumen: DokumenArmadaWithArmada[]
}

export type RingkasanDokumenUnit = Record<KondisiDokumenUnit | 'total', number>

type DocPayload = {
    jenis_dokumen: string
    nomor?: string | null
    berlaku_sampai?: string | null
    url_file?: string | null
}

export type DokumenBatchItem = {
    jenis_dokumen: string
    nomor: string | null
    berlaku_sampai: string | null
    file: File
}

export type PerpanjangPayload = {
    nomor: string | null
    berlaku_sampai: string
    file: File
}

function buildFormData(payload: DocPayload, file: File): FormData {
    const fd = new FormData()
    fd.append('jenis_dokumen', payload.jenis_dokumen)
    if (payload.nomor) fd.append('nomor', payload.nomor)
    if (payload.berlaku_sampai) fd.append('berlaku_sampai', payload.berlaku_sampai)
    fd.append('file', file)
    return fd
}

export const dokumenArmadaService = {
    async perUnit(params?: { page?: number; limit?: number; id_armada?: string; jenis_dokumen?: string; search?: string; kondisi?: KondisiDokumenUnit }) {
        const { data } = await axios.get(API_ENDPOINTS.DOKUMEN_ARMADA_PER_UNIT, { params })
        return data as {
            data: DokumenPerUnit[]
            meta: { page: number; total: number; totalPages: number; limit: number; ringkasan: RingkasanDokumenUnit }
        }
    },

    async list(idArmada: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_DOKUMEN(idArmada))
        return data.data as DokumenArmada[]
    },

    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.DOKUMEN_ARMADA_DETAIL(id))
        return data.data as DokumenArmadaDetail
    },

    async create(idArmada: string, payload: DocPayload, file?: File | null) {
        const body = file ? buildFormData(payload, file) : payload
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_DOKUMEN(idArmada), body)
        return data.data as DokumenArmada
    },

    async createBatch(idArmada: string, items: DokumenBatchItem[]) {
        const fd = new FormData()
        items.forEach((it, idx) => {
            fd.append(`dokumen[${idx}][jenis_dokumen]`, it.jenis_dokumen)
            if (it.nomor) fd.append(`dokumen[${idx}][nomor]`, it.nomor)
            if (it.berlaku_sampai) fd.append(`dokumen[${idx}][berlaku_sampai]`, it.berlaku_sampai)
            fd.append(`dokumen[${idx}][file]`, it.file)
        })
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_DOKUMEN_BATCH(idArmada), fd)
        return data.data as DokumenArmada[]
    },

    async perpanjang(idArmada: string, id: string, payload: PerpanjangPayload) {
        const fd = new FormData()
        fd.append('nomor', payload.nomor ?? '')
        fd.append('berlaku_sampai', payload.berlaku_sampai)
        fd.append('file', payload.file)
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_DOKUMEN_PERPANJANG(idArmada, id), fd)
        return data.data as DokumenArmada
    },

    async update(idArmada: string, id: string, payload: Partial<DocPayload>, file?: File | null) {
        if (file) {
            const fd = buildFormData({ jenis_dokumen: payload.jenis_dokumen ?? '', ...payload }, file)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.ARMADA_DOKUMEN_UPDATE(idArmada, id), fd)
            return data.data as DokumenArmada
        }
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_DOKUMEN_UPDATE(idArmada, id), payload)
        return data.data as DokumenArmada
    },

    async delete(idArmada: string, id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_DOKUMEN_DELETE(idArmada, id))
    },
}
