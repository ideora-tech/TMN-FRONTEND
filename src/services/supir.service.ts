import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Supir {
    id_supir: string
    nama: string
    no_sim: string | null
    jenis_sim: string
    tgl_kadaluarsa_sim?: string
    telepon?: string
    status: 'aktif' | 'nonaktif'
    id_armada_default?: string | null
    armada_default?: string | null
    id_karyawan?: string | null
    id_pengguna?: string | null
    username_pengguna?: string | null
}

export interface OpsiPenggunaSupir {
    id_pengguna: string
    username: string
    email: string
    id_supir_tertaut: string | null
    nama_supir_tertaut: string | null
}

async function unduhExcel(url: string, namaFile: string) {
    const res = await axios.get(url, { responseType: 'blob' })
    const href = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = href
    link.download = namaFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
}

const slugNama = (nama: string) => nama.trim().replace(/\s+/g, '-').toLowerCase()

export const supirService = {
    async list(page = 1, limit = 15, search?: string, status?: string) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR, { params: { page, limit, search: search || undefined, status: status || undefined } })
        return data as { data: Supir[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_DETAIL(id))
        return data.data as Supir
    },
    async create(payload: Omit<Supir, 'id_supir' | 'status'>) {
        const { data } = await axios.post(API_ENDPOINTS.SUPIR, payload)
        return data.data as Supir
    },
    async update(id: string, payload: Partial<Supir>) {
        const { data } = await axios.put(API_ENDPOINTS.SUPIR_DETAIL(id), payload)
        return data.data as Supir
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.SUPIR_DETAIL(id))
    },
    async opsiPengguna() {
        const { data } = await axios.get(API_ENDPOINTS.SUPIR_OPSI_PENGGUNA)
        return data.data as OpsiPenggunaSupir[]
    },
    async exportRiwayatArmada(id: string, nama: string) {
        await unduhExcel(API_ENDPOINTS.SUPIR_RIWAYAT_ARMADA_EXPORT(id), `riwayat-armada-${slugNama(nama)}.xlsx`)
    },
    async exportRiwayatTrip(id: string, nama: string) {
        await unduhExcel(API_ENDPOINTS.SUPIR_RIWAYAT_TRIP_EXPORT(id), `riwayat-trip-${slugNama(nama)}.xlsx`)
    },
}
