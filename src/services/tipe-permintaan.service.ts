import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type JenisFormPermintaan = 'umum' | 'sparepart' | 'aset'

export const JENIS_FORM_LABEL: Record<JenisFormPermintaan, string> = {
    umum: 'Umum (Barang/Jasa)',
    sparepart: 'Spare Part',
    aset: 'Aset / Unit Armada Baru',
}

export const JENIS_FORM_HINT: Record<JenisFormPermintaan, string> = {
    umum: 'Form barang/jasa; barang dari Master Barang atau diketik manual',
    sparepart: 'Form spare part dari master, bisa ditautkan ke armada/perawatan; ada batas pembelian mandiri',
    aset: 'Form unit armada baru (jenis, merk, tahun); pembayaran termin dan didaftarkan ke master Armada',
}

export interface TipePermintaan {
    id_tipe_permintaan: string
    nama_tipe: string
    jenis_form: JenisFormPermintaan
    aktif: boolean
    jumlah_judul?: number | null
    dibuat_pada?: string
    diubah_pada?: string
}

type TipePermintaanRaw = Omit<TipePermintaan, 'aktif'> & { aktif: boolean | number | string }

const normalize = (row: TipePermintaanRaw): TipePermintaan => ({
    ...row,
    aktif: row.aktif === true || row.aktif === 1 || row.aktif === '1',
})

export const tipePermintaanService = {
    async list(page = 1, limit = 15, search?: string, aktif?: '' | '1' | '0') {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PERMINTAAN, { params: { page, limit, search: search || undefined, aktif: aktif || undefined } })
        return {
            data: (data.data as TipePermintaanRaw[]).map(normalize),
            meta: data.meta as { page: number; total: number; totalPages: number; limit: number },
        }
    },
    async opsiAktif() {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PERMINTAAN_OPSI_AKTIF)
        return (data.data as TipePermintaanRaw[]).map(normalize)
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.TIPE_PERMINTAAN_DETAIL(id))
        return normalize(data.data as TipePermintaanRaw)
    },
    async create(payload: { nama_tipe: string; jenis_form: JenisFormPermintaan; aktif: boolean }) {
        const { data } = await axios.post(API_ENDPOINTS.TIPE_PERMINTAAN, payload)
        return normalize(data.data as TipePermintaanRaw)
    },
    async update(id: string, payload: Partial<{ nama_tipe: string; jenis_form: JenisFormPermintaan; aktif: boolean }>) {
        const { data } = await axios.put(API_ENDPOINTS.TIPE_PERMINTAAN_DETAIL(id), payload)
        return normalize(data.data as TipePermintaanRaw)
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.TIPE_PERMINTAAN_DETAIL(id))
    },
}
