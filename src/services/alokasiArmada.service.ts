import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type SumberAlokasi = 'default' | 'otomatis' | 'manual'

export interface AlokasiArmada {
    id_alokasi: string
    tanggal: string
    id_proyek: string
    id_supir: string
    id_armada: string | null
    id_pemilik_asal: string | null
    sumber: SumberAlokasi
    keterangan: string | null
    dibuat_pada: string
    supir_nama: string
    armada_nopol: string | null
    pemilik_nama: string | null
    nama_proyek: string | null
}

export interface ArmadaTersedia {
    id_armada: string
    nopol: string
    nama_pemilik: string | null
    keterangan: string
}

export interface RiwayatAlokasiItem {
    tanggal: string
    sumber: SumberAlokasi
    keterangan: string | null
    dibuat_pada: string | null
    dihapus_pada: string | null
    supir_nama: string
    pemilik_nama: string | null
    nama_proyek: string | null
}

export const alokasiArmadaService = {
    async list(params?: { page?: number; limit?: number; tanggal_dari?: string; tanggal_sampai?: string; search?: string; id_armada?: string; id_proyek?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.ALOKASI_ARMADA, { params })
        return data as { data: AlokasiArmada[]; meta: { page: number; limit: number; total: number; totalPages: number } }
    },
    async riwayatArmada(idArmada: string, params?: { tanggal_dari?: string; tanggal_sampai?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.ALOKASI_ARMADA_RIWAYAT, {
            params: { id_armada: idArmada, ...params },
        })
        return data.data as { armada: { id_armada: string; nopol: string; merk: string | null }; items: RiwayatAlokasiItem[] }
    },
    async downloadRiwayatArmada(nopol: string, format: 'excel' | 'pdf', params: { id_armada: string; tanggal_dari?: string; tanggal_sampai?: string }) {
        const res = await axios.get(API_ENDPOINTS.ALOKASI_ARMADA_EXPORT(format), { responseType: 'blob', params })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `riwayat-armada-${nopol.replace(/\s/g, '')}.${format === 'excel' ? 'xlsx' : 'pdf'}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
    async armadaTersedia(tanggal: string, idSupir?: string, idProyek?: string) {
        const { data } = await axios.get(API_ENDPOINTS.ALOKASI_ARMADA_TERSEDIA, {
            params: { tanggal, id_supir: idSupir || undefined, id_proyek: idProyek || undefined },
        })
        return data.data as ArmadaTersedia[]
    },
    async override(id: string, idArmada: string) {
        const { data } = await axios.put(API_ENDPOINTS.ALOKASI_ARMADA_DETAIL(id), { id_armada: idArmada })
        return data.data as AlokasiArmada
    },
}
