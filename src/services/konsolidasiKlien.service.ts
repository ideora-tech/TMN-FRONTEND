import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { TipeHarga } from '@/constants/tipeHarga.constant'

export interface KonsolidasiKlienTrip {
    id_trip: string
    id_proyek: string | null
    id_rute: string | null
    tanggal: string
    kode_proyek: string | null
    nama_proyek: string | null
    rute: string | null
    asal: string | null
    tujuan: string | null
    nopol: string | null
    supir_nama: string | null
    sumber: 'internal' | 'vendor'
    jarak_tempuh_km: number | null
    tarif: { harga: number; perkiraan: boolean } | null
    borongan: boolean
    tipe_harga: TipeHarga
    sudah_difakturkan: boolean
    titik_drop: string[]
    biaya_tambahan: number
}

export interface KonsolidasiKlienRekap {
    klien: { id_klien: string; nama_klien: string }
    ringkasan: {
        total_rit: number
        total_jarak_km: number
        estimasi_nilai: number
        tanpa_tarif: number
    }
    trips: KonsolidasiKlienTrip[]
}

export interface SiapTagihItem {
    id_klien: string
    nama_klien: string
    id_proyek: string
    kode_proyek: string | null
    nama_proyek: string | null
    borongan: boolean
    jumlah_trip: number
    tanggal_pertama: string | null
    tanggal_terakhir: string | null
}

export const konsolidasiKlienService = {
    async siapTagih() {
        const { data } = await axios.get(API_ENDPOINTS.KONSOLIDASI_KLIEN_SIAP_TAGIH)
        return data.data as SiapTagihItem[]
    },
    async rekap(idKlien: string, dari?: string, sampai?: string, sumber?: string, idProyek?: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONSOLIDASI_KLIEN, {
            params: { id_klien: idKlien, dari: dari || undefined, sampai: sampai || undefined, sumber: sumber || undefined, id_proyek: idProyek || undefined },
        })
        return data.data as KonsolidasiKlienRekap
    },
    async exportExcel(idKlien: string, namaKlien: string, dari?: string, sampai?: string, sumber?: string, idProyek?: string) {
        const res = await axios.get(API_ENDPOINTS.KONSOLIDASI_KLIEN_EXPORT_EXCEL, {
            responseType: 'blob',
            params: { id_klien: idKlien, dari: dari || undefined, sampai: sampai || undefined, sumber: sumber || undefined, id_proyek: idProyek || undefined },
        })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `konsolidasi-${namaKlien.replace(/\s+/g, '-').toLowerCase()}-${dari || 'semua'}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
