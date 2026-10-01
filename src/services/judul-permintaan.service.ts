import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type TipeJudulPermintaan = 'umum' | 'sparepart' | 'aset'

export const TIPE_JUDUL_LABEL: Record<TipeJudulPermintaan, string> = {
    umum: 'Umum (Barang/Jasa)',
    sparepart: 'Spare Part',
    aset: 'Aset / Unit Armada Baru',
}

export interface JudulPermintaan {
    id_judul_permintaan: string
    nama_judul: string
    tipe: TipeJudulPermintaan
    id_tipe_permintaan?: string | null
    nama_tipe?: string | null
    aktif: boolean
    dibuat_pada?: string
    diubah_pada?: string
}

type JudulPermintaanRaw = Omit<JudulPermintaan, 'aktif'> & { aktif: boolean | number | string }

const normalize = (row: JudulPermintaanRaw): JudulPermintaan => ({
    ...row,
    aktif: row.aktif === true || row.aktif === 1 || row.aktif === '1',
})

export const judulPermintaanService = {
    async list(page = 1, limit = 15, search?: string, aktif?: '' | '1' | '0') {
        const { data } = await axios.get(API_ENDPOINTS.JUDUL_PERMINTAAN, { params: { page, limit, search: search || undefined, aktif: aktif || undefined } })
        return {
            data: (data.data as JudulPermintaanRaw[]).map(normalize),
            meta: data.meta as { page: number; total: number; totalPages: number; limit: number },
        }
    },
    async opsiAktif() {
        const { data } = await axios.get(API_ENDPOINTS.JUDUL_PERMINTAAN_OPSI_AKTIF)
        return (data.data as JudulPermintaanRaw[]).map(normalize)
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.JUDUL_PERMINTAAN_DETAIL(id))
        return normalize(data.data as JudulPermintaanRaw)
    },
    async create(payload: { nama_judul: string; id_tipe_permintaan: string; aktif: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.JUDUL_PERMINTAAN, payload)
        return normalize(data.data as JudulPermintaanRaw)
    },
    async update(id: string, payload: Partial<{ nama_judul: string; id_tipe_permintaan: string; aktif: boolean }>) {
        const { data } = await axios.put(API_ENDPOINTS.JUDUL_PERMINTAAN_DETAIL(id), payload)
        return normalize(data.data as JudulPermintaanRaw)
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.JUDUL_PERMINTAAN_DETAIL(id))
    },
}
