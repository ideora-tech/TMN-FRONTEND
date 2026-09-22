import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type StatusKetersediaan = 'tersedia' | 'terjadwal' | 'dipakai' | 'perawatan'

export type SumberUnit = 'aset' | 'vendor'

export interface ProyekRingkas {
    id_proyek: string
    kode_proyek: string | null
    nama_proyek: string | null
    nama_klien: string | null
}

export interface UnitKetersediaan {
    sumber: SumberUnit
    id_unit: string
    nopol: string
    merk: string | null
    model: string | null
    jenis: string | null
    id_jenis_kendaraan: string | null
    nama_jenis_kendaraan: string | null
    kapasitas: string | null
    tahun: number | null
    masa_berlaku_stnk: string | null
    masa_berlaku_kir: string | null
    id_vendor: string | null
    nama_vendor: string | null
    telepon_vendor: string | null
    pic_vendor: string | null
    status_ketersediaan: StatusKetersediaan
    jumlah_proyek: number
    hari_pakai: number
    terakhir_dipakai: string | null
    proyek_terakhir: ProyekRingkas | null
    proyek_jadwal: ProyekRingkas | null
    jadwal_berikutnya: string | null
    terjadwal_sampai: string | null
    perkiraan_bebas: string | null
    perawatan_berikutnya: string | null
}

export interface RiwayatProyekUnit {
    id_proyek: string
    kode_proyek: string | null
    nama_proyek: string | null
    status_proyek: string | null
    nama_klien: string | null
    hari_pakai: number
    hari_terjadwal: number
    pertama_dipakai: string | null
    terakhir_dipakai: string | null
}

export interface DetailUnit extends UnitKetersediaan {
    riwayat_proyek: RiwayatProyekUnit[]
}

export type RingkasanKetersediaan = Record<StatusKetersediaan | 'total', number>

export interface KetersediaanPerJenis {
    id_jenis_kendaraan: string | null
    nama_jenis: string
    total: number
    tersedia: number
    terjadwal: number
    dipakai: number
    perawatan: number
    tersedia_aset: number
    tersedia_vendor: number
}

export interface OpsiVendorKetersediaan {
    id_vendor: string
    nama_vendor: string
}

export type FilterKetersediaan = {
    search?: string
    status?: StatusKetersediaan
    sumber?: SumberUnit
    id_vendor?: string
    id_jenis_kendaraan?: string
}

export interface HasilKetersediaan {
    data: UnitKetersediaan[]
    meta: {
        page: number
        limit: number
        total: number
        totalPages: number
        ringkasan: RingkasanKetersediaan
        per_jenis: KetersediaanPerJenis[]
        opsi_vendor: OpsiVendorKetersediaan[]
    }
}

export const ketersediaanVendorService = {
    async list(params: FilterKetersediaan & { page?: number; limit?: number }) {
        const { data } = await axios.get(API_ENDPOINTS.KETERSEDIAAN_VENDOR, { params })
        return data as HasilKetersediaan
    },
    async detail(sumber: SumberUnit, id: string) {
        const { data } = await axios.get(API_ENDPOINTS.KETERSEDIAAN_VENDOR_DETAIL(sumber, id))
        return data.data as DetailUnit
    },
    async downloadExcel(params: FilterKetersediaan) {
        const res = await axios.get(API_ENDPOINTS.KETERSEDIAAN_VENDOR_EXPORT, { responseType: 'blob', params })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = 'ketersediaan-unit.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
